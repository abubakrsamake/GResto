import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from typing import Literal
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user
# 1. Ajout de OrderItem dans les imports de modèles
from app.core.models import Order, OrderItem, Payment, RegisterSession, User
from app.core.websocket_manager import kds_ws_manager
from app.schemas.order import OrderResponse, PaymentResponse
from app.services.receipt import generate_escpos_bytes, generate_text_receipt

router = APIRouter(tags=["Encaissement & Tickets"])


# --- Schémas Pydantic locaux ---
class ProcessPaymentRequest(BaseModel):
    order_id: uuid.UUID
    payment_method: Literal["CASH", "CREDIT_CARD", "MOBILE_MONEY"] = Field(..., json_schema_extra={"example": "CASH"})
    amount_tendered: Decimal = Field(..., gt=0, description="Montant donné par le client")
    reference_code: str | None = Field(None, json_schema_extra={"example": "MM-987654"}, description="Ref transaction Mobile Money/CB")


class PaymentCheckoutResponse(BaseModel):
    order: OrderResponse
    change_given: Decimal
    is_fully_paid: bool
    receipt_text: str


# ----------------------------------------------------------------------------
# 1. TRAITEMENT DU PAIEMENT & RÈGLEMENT DE LA COMMANDE
# ----------------------------------------------------------------------------
@router.post("/checkout", response_model=PaymentCheckoutResponse)
async def process_checkout(
    payload: ProcessPaymentRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Enregistre un paiement pour une commande, calcule le rendu de monnaie,
    met à jour le statut en 'PAID' et met à jour le total de la session de caisse.
    """
    # 1. Charger la commande avec ses relations (OrderItem est maintenant défini)
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.selected_modifiers),
            selectinload(Order.payments)
        )
        .where(Order.id == payload.order_id)
        .with_for_update()
    )
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")

    if payload.amount_tendered <= Decimal("0.00"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le montant encaissé doit être supérieur à zéro."
        )

    user_role = getattr(current_user.role, "code", None)
    if user_role not in {"ADMIN", "SUPERADMIN"} and order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit à cette commande.")

    if order.status == "PAID":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cette commande a déjà été entièrement réglée.")

    if order.status == "CANCELLED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Impossible d'encaisser une commande annulée.")

    # 2. Calculer le solde restant à payer
    already_paid = sum((p.amount for p in order.payments if p.status == "SUCCESS"), Decimal("0.00"))
    remaining_due = order.total_ttc - already_paid

    if remaining_due <= Decimal("0.00"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="La commande est déjà réglée.")

    # 3. Calculer le montant effectif appliqué au paiement et le rendu de monnaie
    amount_applied = min(payload.amount_tendered, remaining_due)
    change_given = Decimal("0.00")

    if payload.payment_method == "CASH" and payload.amount_tendered > remaining_due:
        change_given = payload.amount_tendered - remaining_due

    # 4. Créer l'enregistrement de paiement
    payment = Payment(
        id=uuid.uuid4(),
        order_id=order.id,
        payment_method=payload.payment_method,
        amount=amount_applied,
        reference_code=payload.reference_code,
        status="SUCCESS"
    )
    db.add(payment)
    order.payments.append(payment)

    # 5. Vérifier si la commande est totalement payée
    new_total_paid = already_paid + amount_applied
    is_fully_paid = new_total_paid >= order.total_ttc

    if is_fully_paid:
        order.status = "PAID"

    # 6. Mettre à jour le montant 'expected_amount' de la session de caisse
    session_stmt = select(RegisterSession).where(RegisterSession.id == order.register_session_id)
    session_res = await db.execute(session_stmt)
    register_session = session_res.scalar_one_or_none()

    if register_session:
        current_expected = register_session.expected_amount or register_session.opening_amount
        register_session.expected_amount = current_expected + amount_applied

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le paiement ne peut pas être enregistré pour cette commande."
        )
    await db.refresh(order)

    # Génération du ticket de caisse au format texte
    receipt_txt = generate_text_receipt(order, change_given=change_given)

    # Notification WebSocket aux écrans KDS / POS
    await kds_ws_manager.broadcast_to_kitchen(
        pos_id=order.pos_id,
        message={
            "event": "ORDER_PAID",
            "data": {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "status": order.status,
                "processed_by": str(current_user.id)  # Utilisation de current_user pour l'audit
            }
        }
    )

    return PaymentCheckoutResponse(
        order=OrderResponse.model_validate(order),
        change_given=change_given,
        is_fully_paid=is_fully_paid,
        receipt_text=receipt_txt
    )


# ----------------------------------------------------------------------------
# 2. IMPRESSION / TÉLÉCHARGEMENT TICKET ESC-POS (Binaire pour Imprimante)
# ----------------------------------------------------------------------------
@router.get("/{order_id}/receipt/raw", response_class=Response)
async def print_escpos_receipt(
    order_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Renvoie le flux binaire ESC/POS directement prêt à être envoyé 
    au port d'une imprimante thermique (80mm/58mm) via pywebview ou un driver local.
    """
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.selected_modifiers),
            selectinload(Order.payments)
        )
        .where(Order.id == order_id)
    )
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")

    user_role = getattr(current_user.role, "code", None)
    if user_role not in {"ADMIN", "SUPERADMIN"} and order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit à cette commande.")

    try:
        raw_bytes = generate_escpos_bytes(order)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de générer le ticket de caisse pour cette commande."
        )

    return Response(
        content=raw_bytes,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f"attachment; filename=receipt_{order.order_number}.bin"}
    )