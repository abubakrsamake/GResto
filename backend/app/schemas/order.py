# backend/app/schemas/order.py
import uuid
from typing import Literal, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import Field
from app.schemas.base import BaseSchema, UUIDMixin, TimestampMixin


# --- Articles de la Commande ---
class OrderItemModifierCreate(BaseSchema):
    modifier_id: uuid.UUID


class OrderItemModifierResponse(UUIDMixin, BaseSchema):
    modifier_id: uuid.UUID
    modifier_name: str
    unit_price: Decimal


class OrderItemCreate(BaseSchema):
    product_id: uuid.UUID
    quantity: int = Field(..., gt=0, example=2)
    notes: str | None = Field(None, example="Sans oignons")
    modifiers: list[OrderItemModifierCreate] = Field(default_factory=list)


class OrderItemResponse(UUIDMixin, BaseSchema):
    product_id: uuid.UUID
    product_name: str
    unit_price: Decimal
    tax_rate: Decimal
    quantity: int
    subtotal_ttc: Decimal
    notes: str | None = None
    item_status: str
    selected_modifiers: list[OrderItemModifierResponse] = Field(default_factory=list)


# --- Paiement ---
class PaymentCreate(BaseSchema):
    payment_method: Literal["CASH", "CREDIT_CARD", "MOBILE_MONEY"] = Field(..., example="CASH")
    amount: Decimal = Field(..., gt=0)
    reference_code: str | None = None


class PaymentResponse(UUIDMixin, BaseSchema):
    payment_method: str
    amount: Decimal
    reference_code: str | None = None
    status: str
    created_at: datetime


# --- Commande Globale ---
class OrderCreate(BaseSchema):
    pos_id: uuid.UUID
    register_session_id: uuid.UUID
    table_id: uuid.UUID | None = None
    order_type: str = Field(default="DINE_IN", description="DINE_IN, TAKEAWAY, DELIVERY")
    notes: str | None = None
    items: list[OrderItemCreate] = Field(..., min_length=1)
    payments: list[PaymentCreate] = Field(default_factory=list)


class OrderStatusUpdate(BaseSchema):
    status: Literal["PENDING", "PREPARING", "IN_PREPARATION", "READY", "SERVED", "CANCELLED", "PAID"]


class OrderResponse(UUIDMixin, BaseSchema, TimestampMixin):
    order_number: str
    pos_id: uuid.UUID
    register_session_id: uuid.UUID
    user_id: uuid.UUID
    table_id: uuid.UUID | None = None
    order_type: str
    status: str
    total_ht: Decimal
    total_tax: Decimal
    discount_amount: Decimal
    total_ttc: Decimal
    notes: str | None = None
    items: list[OrderItemResponse] = Field(default_factory=list)
    payments: list[PaymentResponse] = Field(default_factory=list)

# app/schemas/invoice.py (ou order.py)


class InvoiceItemResponse(BaseSchema):
    product_name: str
    quantity: int
    unit_price: float  # <--- AJOUTER CE CHAMP
    total: float       # <--- OU CE CHAMP
    notes: Optional[str] = None

    class Config:
        from_attributes = True