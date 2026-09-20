#!/usr/bin/env python3
"""Seed simplifié exécuté depuis le dossier backend."""
import sys, os, uuid, asyncio
from decimal import Decimal
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, engine, Base
from sqlalchemy.orm import selectinload
from sqlalchemy import select
from app.core.models import (
    User, Role, PointOfSale, Register, RegisterSession,
    Category, Product, ModifierGroup, Modifier, DiningTable,
    Order, OrderItem, Payment
)


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with AsyncSessionLocal() as db:
        # Rôles
        stmt_all = select(Role).where(Role.code.in_(["SUPERADMIN", "CASHIER"]))
        existing_roles = (await db.execute(stmt_all)).scalars().all()
        role_map = {r.code: r for r in existing_roles}
        if "SUPERADMIN" not in role_map:
            ra = Role(id=uuid.uuid4(), code="SUPERADMIN", label="Admin")
            db.add(ra); await db.flush(); role_map["SUPERADMIN"] = ra
        else:
            ra = role_map["SUPERADMIN"]
        if "CASHIER" not in role_map:
            rc = Role(id=uuid.uuid4(), code="CASHIER", label="Caissier")
            db.add(rc); await db.flush(); role_map["CASHIER"] = rc
        else:
            rc = role_map["CASHIER"]
        # Utilisateurs
        ua = User(id=uuid.uuid4(), first_name="Admin", last_name="Resto", email="admin@resto.com", pin_code="$2b$12$9gLGH/FzQX2PjbtUt5mIXONww3enVqZgF.u7l3JsI4/8Eja8CCsZC", is_active=True, role_id=ra.id)
        uc = User(id=uuid.uuid4(), first_name="Marie", last_name="Dupont", email="marie@resto.com", pin_code="$2b$12$9gLGH/FzQX2PjbtUt5mIXONww3enVqZgF.u7l3JsI4/8Eja8CCsZC", is_active=True, role_id=rc.id)
        db.add_all([ua, uc])
        # POS + Registre + Session
        p = PointOfSale(id=uuid.uuid4(), name="Caisse 1", address="123 Rue", is_active=True)
        reg = Register(id=uuid.uuid4(), pos_id=p.id, name="Reg1", code="R1", is_active=True)
        sess = RegisterSession(id=uuid.uuid4(), register_id=reg.id, opened_by=ua.id, opening_amount=Decimal("500000"), expected_amount=Decimal("500000"), status="OPEN")
        db.add_all([p, reg, sess])
        # Catégories + Produits (plus nombreux pour voir dans l'interface)
        c1 = Category(id=uuid.uuid4(), name="Boissons", is_active=True)
        c2 = Category(id=uuid.uuid4(), name="Plats", is_active=True)
        c3 = Category(id=uuid.uuid4(), name="Desserts", is_active=True)
        db.add_all([c1, c2, c3])
        # === Produits (plus nombreux) ===
        cats = {
            "Boissons": c1.id,
            "Plats": c2.id,
            "Desserts": c3.id,
        }
        produits = [
            ("Eau Minérale 50cl", "Boissons", "500"),
            ("Coca Cola 33cl", "Boissons", "800"),
            ("Jus d'Orange 25cl", "Boissons", "1200"),
            ("Steak Frites", "Plats", "8500"),
            ("Poulet Yassa", "Plats", "7500"),
            ("Gratin de Poisson", "Plats", "9200"),
            ("Salade César", "Plats", "4500"),
            ("Cake au Chocolat", "Desserts", "2500"),
            ("Crème Brûlée", "Desserts", "3500"),
            ("Tarte Tatin", "Desserts", "3000"),
            ("Mousse au Café", "Desserts", "2800"),
            ("Frites Nature", "Plats", "1500"),
        ]
        for nom, cat, prix in produits:
            prod = Product(
                id=uuid.uuid4(), category_id=cats[cat], name=nom,
                base_price=Decimal(prix), tax_rate=Decimal("18.00"), is_active=True
            )
            db.add(prod)
        # Modificateurs
        g = ModifierGroup(id=uuid.uuid4(), name="Options", is_required=False)
        db.add(g)
        # Table
        db.add(DiningTable(id=uuid.uuid4(), pos_id=p.id, table_number="T1", capacity=4))
        # Commande exemple avec plusieurs produits
        oid = uuid.uuid4()
        first_prod_id = None
        # Utiliser le premier produit créé (Eau Minérale) pour la commande
        stmt_first = select(Product).where(Product.name == "Eau Minérale 50cl")
        result_first = await db.execute(stmt_first)
        prod_first = result_first.scalar_one_or_none()
        first_prod_id = prod_first.id if prod_first else uuid.uuid4()
        item = OrderItem(
            id=uuid.uuid4(), order_id=oid, product_id=first_prod_id,
            product_name="Eau Minérale 50cl", unit_price=Decimal("500"), tax_rate=Decimal("18.00"),
            quantity=2, subtotal_ttc=Decimal("1000"), item_status="PENDING"
        )
        order = Order(id=oid, order_number="ORD-SEED-001", pos_id=p.id, register_session_id=sess.id,
                      user_id=uc.id, order_type="DINE_IN", status="PENDING",
                      total_ht=Decimal("847.46"), total_tax=Decimal("152.54"), total_ttc=Decimal("1000.00"),
                      items=[item])
        db.add(order)
        db.add(Payment(id=uuid.uuid4(), order_id=oid, payment_method="CASH", amount=Decimal("1000"), status="SUCCESS"))
        await db.commit()
        print("Seed termine :", len(produits), "produits inseres, categories:", c1.name, c2.name, c3.name)


if __name__ == "__main__":
    asyncio.run(seed())
