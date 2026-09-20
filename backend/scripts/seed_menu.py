#!/usr/bin/env python3
"""Seed idempotent du catalogue Espace Cadre.

Les produits sont identifies par leur nom afin que le script puisse etre
relance apres une modification du menu sans creer de doublons.
"""
import asyncio
import os
import sys
from decimal import Decimal

from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, Base, engine
from app.core.models import Category, Product


MENU = [
    {
        "name": "Fast-Food",
        "color_code": "#D71920",
        "display_order": 1,
        "products": [
            ("Burger", 3000),
            ("Panini", 2000),
            ("Shawarma viande", 2000),
            ("Shawarma poulet", 3000),
            ("Tacos", 4000),
            ("Nems (4 pieces)", 4000),
        ],
    },
    {
        "name": "Grillades",
        "color_code": "#F04438",
        "display_order": 2,
        "products": [
            ("Brochette viande", 3000),
            ("Poulet demi", 4000),
            ("Poulet entier", 6000),
            ("Cotelettes", 6000),
        ],
    },
    {
        "name": "Jus",
        "color_code": "#E85D04",
        "display_order": 3,
        "products": [
            ("Bissap (verre)", 1000),
            ("Gingembre", 1000),
            ("Baobab", 1500),
            ("Zabbaan", 1500),
            ("Tchokondji", 1500),
            ("Mougoudji", 1500),
            ("Citron", 1500),
            ("Ener revolution", 1000),
        ],
    },
    {
        "name": "Accompagnements",
        "color_code": "#F59E0B",
        "display_order": 4,
        "products": [
            ("Frites", 1000),
            ("Alloco", 1000),
        ],
    },
    {
        "name": "Crepes",
        "color_code": "#F59E0B",
        "display_order": 5,
        "products": [
            ("Crepe Nutella", 4000),
            ("Crepe simple (sans chocolat)", 3000),
            ("Crepe sale (avec viande ou poulet)", 5000),
        ],
    },
    {
        "name": "Milkshake",
        "color_code": "#EC4899",
        "display_order": 6,
        "products": [
            ("Milkshake menthe", 4000),
            ("Milkshake Oreo", 4000),
            ("Milkshake vanille", 4000),
            ("Milkshake Cerelac", 5000),
        ],
    },
]


async def seed_menu() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    created = 0
    updated = 0

    async with AsyncSessionLocal() as db:
        for category_data in MENU:
            category_result = await db.execute(
                select(Category).where(Category.name == category_data["name"])
            )
            category = category_result.scalar_one_or_none()

            if category is None:
                category = Category(
                    name=category_data["name"],
                    color_code=category_data["color_code"],
                    display_order=category_data["display_order"],
                    is_active=True,
                )
                db.add(category)
                await db.flush()
            else:
                category.color_code = category_data["color_code"]
                category.display_order = category_data["display_order"]
                category.is_active = True

            for product_name, price in category_data["products"]:
                product_result = await db.execute(
                    select(Product).where(Product.name == product_name)
                )
                product = product_result.scalar_one_or_none()

                if product is None:
                    db.add(Product(
                        category_id=category.id,
                        name=product_name,
                        base_price=Decimal(price),
                        tax_rate=Decimal("18.00"),
                        is_active=True,
                    ))
                    created += 1
                else:
                    product.category_id = category.id
                    product.base_price = Decimal(price)
                    product.tax_rate = Decimal("18.00")
                    product.is_active = True
                    updated += 1

        await db.commit()

    print(f"Menu synchronise : {created} produits crees, {updated} produits mis a jour.")


if __name__ == "__main__":
    asyncio.run(seed_menu())
