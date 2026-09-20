import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import require_roles
from app.core.models import PointOfSale, User, Role
from app.core.security import hash_password

# Utilisation des schémas de user_pos.py
from app.schemas.user_pos import (
    RoleResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
)

router = APIRouter(tags=["Utilisateurs"])

# --- Endpoints Rôles ---
# ⚠️ Doit être défini AVANT /{user_id}
@router.get("/roles", response_model=List[RoleResponse])
async def list_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPERADMIN"])),
):
    result = await db.execute(select(Role))
    roles = result.scalars().all()
    return roles


# --- Endpoints Utilisateurs ---
@router.get("", response_model=List[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPERADMIN"])),
):
    result = await db.execute(
        select(User).options(selectinload(User.role), selectinload(User.points_of_sale))
    )
    return result.scalars().all()


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPERADMIN"])),
):
    role = await db.get(Role, user_in.role_id)
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le rôle spécifié n'existe pas",
        )

    points_of_sale = []
    if user_in.pos_ids:
        pos_result = await db.execute(
            select(PointOfSale).where(
                PointOfSale.id.in_(user_in.pos_ids),
                PointOfSale.is_active == True,
            )
        )
        points_of_sale = list(pos_result.scalars().all())
        if len(points_of_sale) != len(set(user_in.pos_ids)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Un ou plusieurs points de vente sont introuvables ou inactifs.",
            )

    if user_in.email:
        existing_email = await db.execute(
            select(User.id).where(User.email == user_in.email.strip().lower())
        )
        if existing_email.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un utilisateur avec cet email existe déjà.",
            )

    if user_in.phone:
        existing_phone = await db.execute(
            select(User.id).where(User.phone == user_in.phone.strip())
        )
        if existing_phone.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un utilisateur avec ce téléphone existe déjà.",
            )

    user_data = user_in.model_dump(exclude={"password", "pos_ids"})
    if user_in.password:
        user_data["hashed_password"] = hash_password(user_in.password)
    if user_in.pin_code:
        user_data["pin_code"] = hash_password(user_in.pin_code)

    new_user = User(**user_data)
    new_user.points_of_sale = points_of_sale
    db.add(new_user)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise

    result = await db.execute(
        select(User).options(
            selectinload(User.role), selectinload(User.points_of_sale)
        ).where(User.id == new_user.id)
    )
    return result.scalar_one()


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPERADMIN"])),
):
    result = await db.execute(
        select(User).options(selectinload(User.points_of_sale)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    update_data = user_in.model_dump(exclude_unset=True)
    pos_ids = update_data.pop("pos_ids", None)
    if update_data.get("password"):
        update_data["hashed_password"] = hash_password(update_data.pop("password"))
    else:
        update_data.pop("password", None)
    if update_data.get("pin_code"):
        update_data["pin_code"] = hash_password(update_data["pin_code"])
    for field, value in update_data.items():
        setattr(user, field, value)
    if pos_ids is not None:
        pos_result = await db.execute(
            select(PointOfSale).where(
                PointOfSale.id.in_(pos_ids),
                PointOfSale.is_active == True,
            )
        )
        points_of_sale = list(pos_result.scalars().all())
        if len(points_of_sale) != len(set(pos_ids)):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Un ou plusieurs points de vente sont introuvables ou inactifs.",
            )
        user.points_of_sale = points_of_sale
    await db.commit()

    result = await db.execute(
        select(User).options(
            selectinload(User.role), selectinload(User.points_of_sale)
        ).where(User.id == user_id)
    )
    return result.scalar_one()


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(["ADMIN", "SUPERADMIN"])),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")
    await db.delete(user)
    await db.commit()