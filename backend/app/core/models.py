# backend/app/models/models.py
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from decimal import Decimal

from sqlalchemy import (
    String, Text, Boolean, Integer, Numeric, ForeignKey, Table, Column, Index, UniqueConstraint, DateTime
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.core.database import Base


# ============================================================================
# TABLE DE LIAISON (User <-> POS)
# ============================================================================
user_pos_access = Table(
    "user_pos_access",
    Base.metadata,
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("pos_id", UUID(as_uuid=True), ForeignKey("points_of_sale.id", ondelete="CASCADE"), primary_key=True),
)

# Table de liaison (Product <-> ModifierGroup)
product_modifier_groups = Table(
    "product_modifier_groups",
    Base.metadata,
    Column("product_id", UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", UUID(as_uuid=True), ForeignKey("modifier_groups.id", ondelete="CASCADE"), primary_key=True),
)


# ============================================================================
# 1. UTILISATEURS, RÔLES & POS
# ============================================================================

class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    users: Mapped[List["User"]] = relationship(back_populates="role")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="RESTRICT"), nullable=False, index=True)
    first_name: Mapped[str] = mapped_column(String(50), nullable=False)
    last_name: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(30), index=True)
    pin_code: Mapped[Optional[str]] = mapped_column(String(255))
    hashed_password: Mapped[Optional[str]] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    last_seen_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

    @property
    def is_online(self) -> bool:
        return bool(
            self.last_seen_at
            and datetime.now(timezone.utc) - self.last_seen_at.replace(tzinfo=timezone.utc) <= timedelta(minutes=2)
        )

    role: Mapped["Role"] = relationship(back_populates="users")
    points_of_sale: Mapped[List["PointOfSale"]] = relationship(secondary=user_pos_access, back_populates="users")
    opened_sessions: Mapped[List["RegisterSession"]] = relationship(foreign_keys="RegisterSession.opened_by", back_populates="opener")
    closed_sessions: Mapped[List["RegisterSession"]] = relationship(foreign_keys="RegisterSession.closed_by", back_populates="closer")
    orders: Mapped[List["Order"]] = relationship(back_populates="user")

    @property
    def pos_ids(self) -> list[uuid.UUID]:
        return [pos.id for pos in self.points_of_sale]


class PointOfSale(Base):
    __tablename__ = "points_of_sale"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    address: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    users: Mapped[List["User"]] = relationship(secondary=user_pos_access, back_populates="points_of_sale")
    registers: Mapped[List["Register"]] = relationship(back_populates="pos", cascade="all, delete-orphan")
    tables: Mapped[List["DiningTable"]] = relationship(back_populates="pos", cascade="all, delete-orphan")
    orders: Mapped[List["Order"]] = relationship(back_populates="pos")


class Register(Base):
    __tablename__ = "registers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pos_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("points_of_sale.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    pos: Mapped["PointOfSale"] = relationship(back_populates="registers")
    sessions: Mapped[List["RegisterSession"]] = relationship(back_populates="register")


# ============================================================================
# 2. SESSIONS DE CAISSE
# ============================================================================

class RegisterSession(Base):
    __tablename__ = "register_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    register_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("registers.id", ondelete="RESTRICT"), nullable=False, index=True)
    opened_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    closed_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"))
    opening_time: Mapped[datetime] = mapped_column(server_default=func.now())
    closing_time: Mapped[Optional[datetime]]
    opening_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    expected_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    actual_amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    status: Mapped[str] = mapped_column(String(20), default="OPEN", index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    register: Mapped["Register"] = relationship(back_populates="sessions")
    opener: Mapped["User"] = relationship(foreign_keys=[opened_by], back_populates="opened_sessions")
    closer: Mapped[Optional["User"]] = relationship(foreign_keys=[closed_by], back_populates="closed_sessions")
    orders: Mapped[List["Order"]] = relationship(back_populates="register_session")


# ============================================================================
# 3. CATALOGUE & MODIFICATEURS
# ============================================================================

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    color_code: Mapped[Optional[str]] = mapped_column(String(7))
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    products: Mapped[List["Product"]] = relationship(back_populates="category")


class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    sku: Mapped[Optional[str]] = mapped_column(String(50), unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(Text)
    base_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=0.00)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    category: Mapped["Category"] = relationship(back_populates="products")
    modifier_groups: Mapped[List["ModifierGroup"]] = relationship(secondary=product_modifier_groups, back_populates="products")
    pos_prices: Mapped[List["POSProductPrice"]] = relationship(back_populates="product", cascade="all, delete-orphan")


class POSProductPrice(Base):
    __tablename__ = "pos_product_prices"

    pos_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("points_of_sale.id", ondelete="CASCADE"), primary_key=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    product: Mapped["Product"] = relationship(back_populates="pos_prices")


class ModifierGroup(Base):
    __tablename__ = "modifier_groups"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    min_selection: Mapped[int] = mapped_column(Integer, default=0)
    max_selection: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    modifiers: Mapped[List["Modifier"]] = relationship(back_populates="group", cascade="all, delete-orphan")
    products: Mapped[List["Product"]] = relationship(secondary=product_modifier_groups, back_populates="modifier_groups")


class Modifier(Base):
    __tablename__ = "modifiers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    group_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("modifier_groups.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    price_override: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0.00)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["ModifierGroup"] = relationship(back_populates="modifiers")


# ============================================================================
# 4. TABLES EN SALLE
# ============================================================================

class DiningTable(Base):
    __tablename__ = "dining_tables"
    __table_args__ = (UniqueConstraint("pos_id", "table_number", name="uq_pos_table_number"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pos_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("points_of_sale.id", ondelete="CASCADE"), nullable=False)
    table_number: Mapped[str] = mapped_column(String(20), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, default=4)
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    pos: Mapped["PointOfSale"] = relationship(back_populates="tables")
    orders: Mapped[List["Order"]] = relationship(back_populates="table")


# ============================================================================
# 5. COMMANDES, ARTICLES & PAIEMENTS
# ============================================================================

class Order(Base):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_number: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    pos_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("points_of_sale.id", ondelete="RESTRICT"), nullable=False, index=True)
    register_session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("register_sessions.id", ondelete="RESTRICT"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    table_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("dining_tables.id", ondelete="SET NULL"))
    order_type: Mapped[str] = mapped_column(String(20), default="DINE_IN")
    status: Mapped[str] = mapped_column(String(20), default="PENDING", index=True)
    total_ht: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    total_tax: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    total_ttc: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0.00)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    pos: Mapped["PointOfSale"] = relationship(back_populates="orders")
    register_session: Mapped["RegisterSession"] = relationship(back_populates="orders")
    user: Mapped["User"] = relationship(back_populates="orders")
    table: Mapped[Optional["DiningTable"]] = relationship(back_populates="orders")
    items: Mapped[List["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[List["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="RESTRICT"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(100), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    subtotal_ttc: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    item_status: Mapped[str] = mapped_column(String(20), default="PENDING")

    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship()
    selected_modifiers: Mapped[List["OrderItemModifier"]] = relationship(back_populates="order_item", cascade="all, delete-orphan")


class OrderItemModifier(Base):
    __tablename__ = "order_item_modifiers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False)
    modifier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("modifiers.id", ondelete="RESTRICT"), nullable=False)
    modifier_name: Mapped[str] = mapped_column(String(50), nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    order_item: Mapped["OrderItem"] = relationship(back_populates="selected_modifiers")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    reference_code: Mapped[Optional[str]] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(20), default="COMPLETED")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    order: Mapped["Order"] = relationship(back_populates="payments")
    
