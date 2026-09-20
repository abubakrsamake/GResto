import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.websocket_manager import kds_ws_manager
from app.core.security import ALGORITHM, SECRET_KEY
from app.core.models import Modifier, ModifierGroup, Order, OrderItem, OrderItemModifier, Product, RegisterSession, User
from app.schemas.order import OrderCreate, OrderResponse, OrderStatusUpdate

router = APIRouter(tags=["Commandes & KDS"])


def generate_order_number() -> str:
    """Génère un numéro de commande lisible (ex: ORD-20260908-184522-83)."""
    now = datetime.now(timezone.utc)
    return f"ORD-{now.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:2].upper()}"


# Helper interne pour charger une commande complète avec ses relations
async def _get_full_order(order_id: uuid.UUID, db: AsyncSession) -> Order | None:
    stmt = (
        select(Order)
        .options(
            selectinload(Order.items).selectinload(OrderItem.selected_modifiers),
            selectinload(Order.payments)
        )
        .where(Order.id == order_id)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ----------------------------------------------------------------------------
# 1. CRÉATION D'UNE COMMANDE (POS -> Cuisine/KDS)
# ----------------------------------------------------------------------------
@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Crée une commande client, calcule les montants/taxes et notifie la cuisine via WebSockets.
    """
    if not payload.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La commande doit contenir au moins un article."
        )

    # 1. Valider que la session de caisse est active
    session_stmt = select(RegisterSession).where(
        RegisterSession.id == payload.register_session_id,
        RegisterSession.status == "OPEN"
    ).options(selectinload(RegisterSession.register))
    session_res = await db.execute(session_stmt)
    register_session = session_res.scalar_one_or_none()

    if not register_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La session de caisse indiquée est fermée ou invalide."
        )

    user_role = getattr(current_user.role, "code", None)
    allowed_pos_ids = {pos.id for pos in current_user.points_of_sale}
    if register_session.register.pos_id != payload.pos_id or (
        user_role not in {"ADMIN", "SUPERADMIN"} and payload.pos_id not in allowed_pos_ids
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La session de caisse n'est pas accessible depuis ce point de vente."
        )

    # 2. Préparation et calcul des articles
    order_id = uuid.uuid4()
    order_items_db: list[OrderItem] = []
    
    total_ht = Decimal("0.00")
    total_tax = Decimal("0.00")

    for item_data in payload.items:
        product_stmt = select(Product).options(
            selectinload(Product.modifier_groups).selectinload(ModifierGroup.modifiers)
        ).where(Product.id == item_data.product_id, Product.is_active == True)
        product_res = await db.execute(product_stmt)
        product = product_res.scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produit ID {item_data.product_id} non trouvé ou inactif."
            )

        unit_price = product.base_price
        tax_rate = product.tax_rate or Decimal("0.00")
        
        selected_modifiers_db: list[OrderItemModifier] = []
        modifiers_additional_price = Decimal("0.00")
        allowed_modifier_ids = {
            modifier.id
            for group in product.modifier_groups
            for modifier in group.modifiers
        }

        for mod_req in item_data.modifiers:
            if mod_req.modifier_id not in allowed_modifier_ids:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Le modificateur {mod_req.modifier_id} n'est pas disponible pour ce produit."
                )
            mod_stmt = select(Modifier).where(Modifier.id == mod_req.modifier_id)
            mod_res = await db.execute(mod_stmt)
            modifier = mod_res.scalar_one_or_none()

            if modifier:
                modifiers_additional_price += modifier.price_override
                selected_modifiers_db.append(
                    OrderItemModifier(
                        id=uuid.uuid4(),
                        modifier_id=modifier.id,
                        modifier_name=modifier.name,
                        unit_price=modifier.price_override
                    )
                )

        effective_unit_price = unit_price + modifiers_additional_price
        line_subtotal_ttc = effective_unit_price * Decimal(item_data.quantity)

        line_subtotal_ht = line_subtotal_ttc / (Decimal("1.00") + (tax_rate / Decimal("100.00")))
        line_tax = line_subtotal_ttc - line_subtotal_ht

        total_ht += line_subtotal_ht
        total_tax += line_tax

        order_item = OrderItem(
            id=uuid.uuid4(),
            order_id=order_id,
            product_id=product.id,
            product_name=product.name,
            unit_price=effective_unit_price,
            tax_rate=tax_rate,
            quantity=item_data.quantity,
            subtotal_ttc=line_subtotal_ttc,
            notes=item_data.notes,
            item_status="PENDING",
            selected_modifiers=selected_modifiers_db
        )
        order_items_db.append(order_item)

    total_ttc_raw = total_ht + total_tax

    # 3. Création de la commande
    order = Order(
        id=order_id,
        order_number=generate_order_number(),
        pos_id=payload.pos_id,
        register_session_id=payload.register_session_id,
        user_id=current_user.id,
        table_id=payload.table_id,
        order_type=payload.order_type,
        status="PENDING",
        total_ht=round(total_ht, 2),
        total_tax=round(total_tax, 2),
        discount_amount=Decimal("0.00"),
        total_ttc=round(total_ttc_raw, 2),
        notes=payload.notes,
        items=order_items_db
    )

    db.add(order)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La commande ne peut pas être enregistrée. Vérifiez les articles et les contraintes métier."
        )

    # Re-chargement asynchrone sécurisé avec relations
    full_order = await _get_full_order(order.id, db)
    if not full_order:
        raise HTTPException(status_code=500, detail="Erreur lors de la récupération de la commande créée.")

    response_data = OrderResponse.model_validate(full_order)

    # Diffusion WS aux terminaux KDS
    await kds_ws_manager.broadcast_to_kitchen(
        pos_id=payload.pos_id,
        message={
            "event": "NEW_ORDER",
            "data": response_data.model_dump(mode="json")
        }
    )

    return response_data


# ----------------------------------------------------------------------------
# 2. LISTER LES COMMANDES ACTIVES
# ----------------------------------------------------------------------------
# ----------------------------------------------------------------------------
# LISTER LES COMMANDES (Filtrage selon le rôle de l'utilisateur connecté)
# ----------------------------------------------------------------------------
from datetime import date
from sqlalchemy import cast, Date

@router.get("", response_model=list[OrderResponse])
async def list_orders(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    pos_id: uuid.UUID | None = None,
    order_date: date | None = Query(default=None, alias="date"),  # <--- Récupère YYYY-MM-DD
    status_filter: list[str] | None = Query(default=None)
):
    stmt = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.selected_modifiers),
        selectinload(Order.payments)
    )

    user_role = getattr(current_user.role, "code", str(current_user.role))
    if user_role not in ["SUPERADMIN", "ADMIN"]:
        stmt = stmt.where(Order.user_id == current_user.id)

    if pos_id:
        stmt = stmt.where(Order.pos_id == pos_id)
        
    if status_filter:
        stmt = stmt.where(Order.status.in_(status_filter))

    # Filtre sur la date spécifique (extrait uniquement la partie Date du Timestamp)
    if order_date:
        stmt = stmt.where(cast(Order.created_at, Date) == order_date)

    stmt = stmt.order_by(Order.created_at.desc())
    result = await db.execute(stmt)
    return [OrderResponse.model_validate(o) for o in result.scalars().all()]


# ----------------------------------------------------------------------------
# 3. MISE À JOUR DU STATUT (KDS Cuisine -> Servie / Annulée)
# ----------------------------------------------------------------------------
@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: uuid.UUID,
    payload: OrderStatusUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Met à jour le statut d'une commande et informe le KDS/POS via WebSocket.
    """
    order = await _get_full_order(order_id, db)

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Commande introuvable.")

    valid_statuses = {"PENDING", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"}
    if payload.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Statut de commande invalide."
        )

    user_role = getattr(current_user.role, "code", None)
    if user_role not in {"ADMIN", "SUPERADMIN"} and order.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès interdit à cette commande.")

    order.status = payload.status
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de mettre à jour le statut de la commande."
        )

    # Re-chargement asynchrone pour éviter la désynchronisation des attributs
    full_order = await _get_full_order(order_id, db)
    response_data = OrderResponse.model_validate(full_order)

    # Broadcast de la mise à jour aux écrans KDS et terminaux POS
    await kds_ws_manager.broadcast_to_kitchen(
        pos_id=order.pos_id,
        message={
            "event": "ORDER_STATUS_CHANGED",
            "data": {
                "order_id": str(order.id),
                "order_number": order.order_number,
                "status": order.status
            }
        }
    )

    return response_data


# ----------------------------------------------------------------------------
# 4. WEBSOCKET ENDPOINT POUR LE KDS (Écrans de Cuisine)
# ----------------------------------------------------------------------------
@router.websocket("/ws/kds/{pos_id}")
async def kds_websocket_endpoint(
    websocket: WebSocket,
    pos_id: uuid.UUID,
    token: str = Query(...),
):
    """
    Point de connexion WebSocket pour les écrans KDS installés en cuisine.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "access" or not payload.get("sub"):
            raise JWTError
    except (JWTError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await kds_ws_manager.connect(pos_id, websocket)
    try:
        while True:
            # Conserve la connexion ouverte (Ping/Pong)
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        kds_ws_manager.disconnect(pos_id, websocket)