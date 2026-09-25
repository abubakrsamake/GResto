from typing import Annotated, List
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models import Order, User
# Importation de ton schéma Pydantic
from app.schemas.invoice import InvoiceResponse

router = APIRouter(tags=["Factures"])


@router.get("/", status_code=status.HTTP_200_OK, response_model=List[InvoiceResponse])
async def list_invoices(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    stmt = (
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
    )
    res = await db.execute(stmt)
    orders = res.scalars().all()

    return [
        {
            "id": str(o.id),
            "order_number": o.order_number,
            "status": o.status,
            "total_ht": float(o.total_ht) if o.total_ht else 0.0,
            "total_tax": float(o.total_tax) if o.total_tax else 0.0,
            "total_ttc": float(o.total_ttc) if o.total_ttc else 0.0,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "pos_id": str(o.pos_id) if o.pos_id else None,
            "items": [
                {
                    "product_name": (
                        f"{item.product_name} ({item.variant_name})"
                        if item.variant_name else item.product_name
                    ),
                    "quantity": item.quantity,
                    "unit_price": float(item.unit_price) if item.unit_price else 0.0,
                    "total": float(item.subtotal_ttc) if item.subtotal_ttc else 0.0,
                    "notes": item.notes or "",
                }
                for item in o.items
            ],
        }
        for o in orders
    ]