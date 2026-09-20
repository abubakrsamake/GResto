import uuid
from decimal import Decimal
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.core.database import AsyncSessionLocal, engine, Base
from app.core.models import (
    User, Role, PointOfSale, Register, RegisterSession,
    Category, Product, ModifierGroup, Modifier, DiningTable,
    Order, OrderItem, OrderItemModifier, Payment
)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # === Rôles ===
        role_admin = Role(id=uuid.uuid4(), code="SUPERADMIN", label="Administrateur", description="Admin système")
        role_caissier = Role(id=uuid.uuid4(), code="CASHIER", label="Caissier", description="Opérateur caisse")
        db.add_all([role_admin, role_caissier])

        # === Utilisateurs ===
        user_admin = User(
            id=uuid.uuid4(), first_name="Admin", last_name="Restaurant",
            email="admin@restaurant.com",
            pin_code="$2b$12$dummyhash", is_active=True, role_id=role_admin.id
        )
        user_caissier = User(
            id=uuid.uuid4(), first_name="Marie", last_name="Dupont",
            email="marie@restaurant.com",
            pin_code="$2b$12$dummyhash", is_active=True, role_id=role_caissier.id
        )
        db.add_all([user_admin, user_caissier])

        # === POS ===
        pos = PointOfSale(
            id=uuid.uuid4(), name="Caisse Principale", address="123 Rue du Restaurant",
            phone="+223 20 20 20 20", is_active=True
        )
        db.add(pos)

        # === Registre / Session ===
        register = Register(id=uuid.uuid4(), pos_id=pos.id, name="Caisse 1", code="C1", is_active=True)
        db.add(register)

        session_open = RegisterSession(
            id=uuid.uuid4(), register_id=register.id, opened_by=user_admin.id,
            opening_amount=Decimal("500000.00"), expected_amount=Decimal("500000.00"),
            status="OPEN", notes="Session du matin"
        )
        db.add(session_open)

        # === Catégories ===
        cat_boissons = Category(id=uuid.uuid4(), name="Boissons", is_active=True)
        cat_plats = Category(id=uuid.uuid4(), name="Plats", is_active=True)
        db.add_all([cat_boissons, cat_plats])

        # === Produits ===
        prod_eau = Product(
            id=uuid.uuid4(), category_id=cat_boissons.id, name="Eau Minérale 50cl",
            base_price=Decimal("500.00"), tax_rate=Decimal("18.00"), is_active=True
        )
        prod_steak = Product(
            id=uuid.uuid4(), category_id=cat_plats.id, name="Steak Frites",
            base_price=Decimal("8500.00"), tax_rate=Decimal("18.00"), is_active=True
        )
        db.add_all([prod_eau, prod_steak])

        # === Modificateurs ===
        group_sauce = ModifierGroup(id=uuid.uuid4(), name="Sauce", is_required=False)
        mod_fromage = Modifier(id=uuid.uuid4(), group_id=group_sauce.id, name="Fromage", price_override=Decimal("1000.00"))
        mod_sans_oignon = Modifier(id=uuid.uuid4(), group_id=group_sauce.id, name="Sans Oignon", price_override=Decimal("0.00"))
        db.add_all([group_sauce, mod_fromage, mod_sans_oignon])

        # === Table ===
        table = DiningTable(id=uuid.uuid4(), pos_id=pos.id, table_number="T1", capacity=4, status="AVAILABLE")
        db.add(table)

        # === Commande d'exemple ===
        order_id = uuid.uuid4()
        item1 = OrderItem(
            id=uuid.uuid4(), order_id=order_id,
            product_id=prod_steak.id, product_name=prod_steak.name,
            unit_price=Decimal("8500.00"), tax_rate=Decimal("18.00"),
            quantity=2, subtotal_ttc=Decimal("17000.00"),
            item_status="PENDING", notes="Bien cuit"
        )
        item2 = OrderItem(
            id=uuid.uuid4(), order_id=order_id,
            product_id=prod_eau.id, product_name=prod_eau.name,
            unit_price=Decimal("500.00"), tax_rate=Decimal("18.00"),
            quantity=2, subtotal_ttc=Decimal("1000.00"),
            item_status="PENDING"
        )

        order = Order(
            id=order_id, order_number="ORD-TEST-001",
            pos_id=pos.id, register_session_id=session_open.id,
            user_id=user_caissier.id, table_id=table.id,
            order_type="DINE_IN", status="PENDING",
            total_ht=Decimal("15254.24"), total_tax=Decimal("2745.76"),
            total_ttc=Decimal("18000.00"), discount_amount=Decimal("0.00"),
            notes="Commande test", items=[item1, item2]
        )
        db.add(order)

        # === Paiement ===
        payment = Payment(
            id=uuid.uuid4(), order_id=order.id,
            payment_method="CASH", amount=Decimal("18000.00"),
            status="SUCCESS", reference_code=None
        )
        db.add(payment)

        await db.commit()
        print("✅ Données de test insérées avec succès.")
        print(f"   POS : {pos.id}  |  Session : {session_open.id}  |  Ordre : {order.order_number}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(seed())
