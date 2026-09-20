import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, ConfigDict

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models import Order, OrderItem
from app.core.models import User

router = APIRouter()


# ==========================================
# 1. SCHÉMAS PYDANTIC (Modèles de données)
# ==========================================

class KDSOrderItemSchema(BaseModel):
    id: uuid.UUID
    product_name: str
    quantity: int
    notes: Optional[str] = None
    status: str  # "PENDING", "PREPARING", "READY"

    model_config = ConfigDict(from_attributes=True)


class KDSOrderSchema(BaseModel):
    id: uuid.UUID
    order_number: str
    order_type: str  # "DINE_IN", "TAKEAWAY", "DELIVERY"
    table_number: Optional[str] = None
    status: str  # "PENDING", "PREPARING", "READY", "SERVED"
    created_at: datetime
    elapsed_minutes: Optional[int] = None
    items: List[KDSOrderItemSchema] = []

    model_config = ConfigDict(from_attributes=True)


class StatusUpdatePayload(BaseModel):
    status: str  # Exemple: "PREPARING", "READY", "SERVED", "CANCELLED"


# ==========================================
# 2. ENDPOINTS : GESTION DE LA CUISINE (KDS)
# ==========================================

@router.get("/orders", response_model=List[KDSOrderSchema])
async def get_kitchen_orders(
    pos_id: Optional[uuid.UUID] = Query(None, description="Filtrer par terminal POS / zone de vente"),
    status_filter: Optional[str] = Query("PENDING,PREPARING", description="Statuts séparés par virgule"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Récupère toutes les commandes actives destinées à la cuisine/bar.
    Calcule automatiquement le temps écoulé en minutes depuis la prise de commande.
    """
    statuses = [s.strip() for s in status_filter.split(",")] if status_filter else ["PENDING", "PREPARING"]

    # Chargement anxieux (selectinload) des items pour la requete asynchrone
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.status.in_(statuses))
    )

    if pos_id:
        stmt = stmt.where(Order.pos_id == pos_id)
    elif getattr(current_user.role, "code", None) not in {"ADMIN", "SUPERADMIN"}:
        stmt = stmt.where(Order.pos_id.in_(pos.id for pos in current_user.points_of_sale))

    stmt = stmt.order_by(Order.created_at.asc())

    result = await db.execute(stmt)
    orders = result.scalars().all()

    now = datetime.now(timezone.utc)
    response_list = []

    for order in orders:
        order_data = KDSOrderSchema.model_validate(order)
        if order.created_at:
            # Gestion du datetime conscient du fuseau horaire
            created_at_utc = order.created_at if order.created_at.tzinfo else order.created_at.replace(tzinfo=timezone.utc)
            delta = now - created_at_utc
            order_data.elapsed_minutes = int(delta.total_seconds() // 60)
        response_list.append(order_data)

    return response_list


@router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: uuid.UUID,
    payload: StatusUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Met à jour le statut global d'une commande depuis l'écran cuisine.
    """
    order = await db.get(Order, order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Commande non trouvée."
        )

    if (getattr(current_user.role, "code", None) not in {"ADMIN", "SUPERADMIN"}
            and order.pos_id not in {pos.id for pos in current_user.points_of_sale}):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Commande inaccessible pour cet utilisateur.")

    order.status = payload.status
    await db.commit()
    await db.refresh(order)

    return {
        "message": f"Statut de la commande #{order.order_number} mis à jour",
        "order_id": order.id,
        "new_status": order.status
    }


@router.patch("/items/{item_id}/status")
async def update_order_item_status(
    item_id: uuid.UUID,
    payload: StatusUpdatePayload,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Met à jour le statut d'un article spécifique au sein d'une commande.
    """
    item_result = await db.execute(
        select(OrderItem).options(selectinload(OrderItem.order)).where(OrderItem.id == item_id)
    )
    item = item_result.scalar_one_or_none()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article de commande non trouvé."
        )

    if (getattr(current_user.role, "code", None) not in {"ADMIN", "SUPERADMIN"}
            and item.order.pos_id not in {pos.id for pos in current_user.points_of_sale}):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Article inaccessible pour cet utilisateur.")

    item.status = payload.status
    await db.commit()

    return {
        "message": "Statut de l'article mis à jour",
        "item_id": item.id,
        "new_status": item.status
    }


@router.get("/history", response_model=List[KDSOrderSchema])
async def get_kitchen_history(
    limit: int = Query(20, ge=1, le=100, description="Nombre de commandes récentes terminées"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Affiche la liste des dernières commandes terminées en cuisine.
    """
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.status.in_(["READY", "SERVED"]))
        .order_by(Order.created_at.desc())
        .limit(limit)
    )
    if getattr(current_user.role, "code", None) not in {"ADMIN", "SUPERADMIN"}:
        stmt = stmt.where(Order.pos_id.in_(pos.id for pos in current_user.points_of_sale))

    result = await db.execute(stmt)
    return result.scalars().all()