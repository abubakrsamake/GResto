#!/usr/bin/env python3
"""Create or update one SUPERADMIN account without seeding POS data."""
import asyncio
import os
import sys
import uuid

from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, engine, Base
from app.core.models import Role, User
from app.core.security import hash_password


async def seed_superadmin() -> None:
    email = os.environ.get("SUPERADMIN_EMAIL", "admin@resto.com").strip().lower()
    password = os.environ.get("SUPERADMIN_PASSWORD")
    first_name = os.environ.get("SUPERADMIN_FIRST_NAME", "Admin")
    last_name = os.environ.get("SUPERADMIN_LAST_NAME", "Restaurant")

    if not password or len(password) < 8:
        raise SystemExit("SUPERADMIN_PASSWORD doit contenir au moins 8 caracteres.")

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        role = (await db.execute(select(Role).where(Role.code == "SUPERADMIN"))).scalar_one_or_none()
        if role is None:
            role = Role(
                id=uuid.uuid4(),
                code="SUPERADMIN",
                label="Administrateur",
                description="Administrateur systeme",
            )
            db.add(role)
            await db.flush()

        user = (await db.execute(select(User).where(User.email == email))).scalar_one_or_none()
        if user is None:
            user = User(
                id=uuid.uuid4(),
                first_name=first_name,
                last_name=last_name,
                email=email,
                is_active=True,
            )
            db.add(user)

        user.first_name = first_name
        user.last_name = last_name
        user.role_id = role.id
        user.hashed_password = hash_password(password)
        user.is_active = True
        await db.commit()

    print(f"SUPERADMIN pret: {email}")


if __name__ == "__main__":
    asyncio.run(seed_superadmin())
