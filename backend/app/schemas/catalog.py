# backend/app/schemas/catalog.py
from typing import Optional
import uuid
from decimal import Decimal
from pydantic import Field, field_validator
from app.schemas.base import BaseSchema, UUIDMixin, TimestampMixin


def _normalize_optional_text(value):
    if value is None:
        return None
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


# --- Modificateurs (Options) ---
class ModifierBase(BaseSchema):
    name: str = Field(..., example="Sauce Blanche")
    price_override: Decimal = Field(default=Decimal("0.00"), ge=0)


class ModifierResponse(ModifierBase, UUIDMixin):
    group_id: uuid.UUID


class ModifierGroupBase(BaseSchema):
    name: str = Field(..., example="Choix de la sauce")
    is_required: bool = False
    min_selection: int = 0
    max_selection: int = 1


class ModifierGroupResponse(ModifierGroupBase, UUIDMixin):
    modifiers: list[ModifierResponse] = Field(default_factory=list)


# --- Catégories ---
class CategoryBase(BaseSchema):
    name: str = Field(..., min_length=2, max_length=50)
    color_code: str | None = Field(None, pattern=r"^#([A-Fa-f0-9]{6})$", example="#FF5733")
    display_order: int = 0
    is_active: bool = True


class CategoryResponse(CategoryBase, UUIDMixin):
    pass


# --- Produits ---
class ProductBase(BaseSchema):
    name: str = Field(..., min_length=2, max_length=100)
    sku: str | None = None
    description: str | None = None
    image_url: str | None = None
    base_price: Decimal = Field(..., gt=0, example=5000.00)
    tax_rate: Decimal = Field(default=Decimal("0.00"), ge=0, example=18.00)
    is_active: bool = True

    @field_validator("sku", "description", "image_url", mode="before")
    @classmethod
    def normalize_optional_text_fields(cls, value):
        return _normalize_optional_text(value)

# Schema partiel pour la mise à jour (PUT)
class ProductUpdate(BaseSchema):
    name: Optional[str] = None
    sku: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    base_price: Optional[Decimal] = Field(None, gt=0)
    tax_rate: Optional[Decimal] = Field(None, ge=0)
    is_active: Optional[bool] = None
    category_id: Optional[uuid.UUID] = None

    @field_validator("name", "sku", "description", "image_url", mode="before")
    @classmethod
    def normalize_optional_text_fields(cls, value):
        return _normalize_optional_text(value)



class ProductCreate(ProductBase):
    category_id: uuid.UUID
    modifier_group_ids: list[uuid.UUID] = Field(default_factory=list)


class ProductResponse(ProductBase, UUIDMixin, TimestampMixin):
    category: CategoryResponse
    modifier_groups: list[ModifierGroupResponse] = Field(default_factory=list)