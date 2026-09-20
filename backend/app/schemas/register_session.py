# backend/app/schemas/register_session.py
import uuid
from datetime import datetime
from decimal import Decimal
from pydantic import Field
from app.schemas.base import BaseSchema, UUIDMixin


class SessionOpenRequest(BaseSchema):
    register_id: uuid.UUID
    opening_amount: Decimal = Field(..., ge=0, example=25000.00)


class SessionCloseRequest(BaseSchema):
    actual_amount: Decimal = Field(..., ge=0, description="Montant réel compté en caisse")
    notes: str | None = None


class RegisterSessionResponse(UUIDMixin, BaseSchema):
    register_id: uuid.UUID
    opened_by: uuid.UUID
    closed_by: uuid.UUID | None = None
    opening_time: datetime
    closing_time: datetime | None = None
    opening_amount: Decimal
    expected_amount: Decimal | None = None
    actual_amount: Decimal | None = None
    status: str
    notes: str | None = None