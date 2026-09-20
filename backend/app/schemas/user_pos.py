# backend/app/schemas/user_pos.py
import uuid
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from app.schemas.base import BaseSchema, UUIDMixin, TimestampMixin


# --- Rôles ---
class RoleBase(BaseSchema):
    code: str = Field(..., example="CASHIER")
    label: str = Field(..., example="Caissier")
    description: str | None = None


class RoleResponse(RoleBase, UUIDMixin):
    pass


# --- Utilisateurs ---
class UserBase(BaseSchema):
    first_name: str = Field(..., min_length=2, max_length=50)
    last_name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr | None = None
    phone: str | None = Field(None, min_length=6, max_length=30)
    is_active: bool = True


class UserCreate(UserBase):
    role_id: uuid.UUID
    password: str | None = Field(None, min_length=6)
    pin_code: str | None = Field(None, min_length=4, max_length=6, pattern=r"^\d+$", description="Code PIN 4-6 chiffres pour POS")
    pos_ids: list[uuid.UUID] = Field(default_factory=list)


class UserUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = Field(None, min_length=6, max_length=30)
    role_id: uuid.UUID | None = None
    is_active: bool | None = None
    pin_code: str | None = Field(None, min_length=4, max_length=6, pattern=r"^\d+$")
    password: str | None = Field(None, min_length=6)
    pos_ids: list[uuid.UUID] | None = None


class UserResponse(UserBase, UUIDMixin, TimestampMixin):
    role: RoleResponse
    pos_ids: list[uuid.UUID] = Field(default_factory=list)
    last_seen_at: datetime | None = None
    is_online: bool = False


class PinLoginRequest(BaseModel):
    pin_code: str = Field(..., min_length=4, max_length=6)
    pos_id: uuid.UUID
    email: EmailStr | None = Field(
        default=None,
        description="Email du vendeur. Requis si plusieurs vendeurs partagent le même PIN.",
    )
    user_id: uuid.UUID | None = Field(
        default=None,
        description="Identifiant du vendeur. Obligatoire si plusieurs vendeurs partagent le même PIN.",
    )


# --- Points de Vente (POS) ---
class PointOfSaleBase(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    address: str | None = None
    phone: str | None = None
    is_active: bool = True


class PointOfSaleCreate(PointOfSaleBase):
    pass


class PointOfSaleResponse(PointOfSaleBase, UUIDMixin, TimestampMixin):
    pass


# --- Caisses Physiques ---
class RegisterBase(BaseSchema):
    name: str = Field(..., example="Caisse Principale")
    code: str = Field(..., example="POS-01")
    is_active: bool = True


class RegisterCreate(RegisterBase):
    pos_id: uuid.UUID


class RegisterResponse(RegisterBase, UUIDMixin):
    pos_id: uuid.UUID