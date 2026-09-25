import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.models import Modifier, ModifierGroup
from app.core.dependencies import get_current_user, require_roles
from app.schemas.catalog import (
    ModifierCreate,
    ModifierResponse,
    ModifierUpdate,
    ModifierGroupCreate,
    ModifierGroupResponse,
    ModifierGroupUpdate
)

router = APIRouter(tags=["Modificateurs"])

# Helper pour le chargement Eager des modificateurs enfants
def get_group_options():
    return [selectinload(ModifierGroup.modifiers)]


# =====================================================================
# 1. GROUPES DE MODIFICATEURS 
# (Placés en premier pour éviter que "modifier-groups" soit interprété comme un UUID par /{modifier_id})
# =====================================================================

@router.post("/modifier-groups", response_model=ModifierGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_modifier_group(
    group_in: ModifierGroupCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    new_group = ModifierGroup(**group_in.model_dump())
    db.add(new_group)
    await db.commit()

    result = await db.execute(
        select(ModifierGroup)
        .options(*get_group_options())
        .where(ModifierGroup.id == new_group.id)
    )
    return result.scalar_one()


@router.get("/modifier-groups", response_model=List[ModifierGroupResponse])
async def get_modifier_groups(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = select(ModifierGroup).options(*get_group_options())
    result = await db.execute(stmt)
    return result.scalars().unique().all()


@router.get("/modifier-groups/{group_id}", response_model=ModifierGroupResponse)
async def get_modifier_group_by_id(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = (
        select(ModifierGroup)
        .options(*get_group_options())
        .where(ModifierGroup.id == group_id)
    )
    result = await db.execute(stmt)
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Groupe de modificateurs introuvable.",
        )
    return group


@router.put("/modifier-groups/{group_id}", response_model=ModifierGroupResponse)
async def update_modifier_group(
    group_id: uuid.UUID,
    group_in: ModifierGroupUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    stmt = (
        select(ModifierGroup)
        .options(*get_group_options())
        .where(ModifierGroup.id == group_id)
    )
    result = await db.execute(stmt)
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Groupe de modificateurs introuvable.",
        )

    update_data = group_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(group, field, value)

    await db.commit()

    updated_result = await db.execute(
        select(ModifierGroup)
        .options(*get_group_options())
        .where(ModifierGroup.id == group_id)
    )
    return updated_result.scalar_one()


@router.delete("/modifier-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_modifier_group(
    group_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    result = await db.execute(select(ModifierGroup).where(ModifierGroup.id == group_id))
    group = result.scalar_one_or_none()

    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Groupe de modificateurs introuvable.",
        )

    await db.delete(group)
    await db.commit()
    return None


# =====================================================================
# 2. MODIFICATEURS (OPTIONS INDIVIDUELLES)
# =====================================================================

@router.post("", response_model=ModifierResponse, status_code=status.HTTP_201_CREATED)
async def create_modifier(
    modifier_in: ModifierCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    group = await db.get(ModifierGroup, modifier_in.group_id)
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Le groupe de modificateurs spécifié n'existe pas.",
        )

    new_modifier = Modifier(**modifier_in.model_dump())
    db.add(new_modifier)
    await db.commit()
    await db.refresh(new_modifier)
    return new_modifier


@router.get("", response_model=List[ModifierResponse])
async def get_modifiers(
    group_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = select(Modifier)
    if group_id:
        stmt = stmt.where(Modifier.group_id == group_id)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{modifier_id}", response_model=ModifierResponse)
async def get_modifier_by_id(
    modifier_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    modifier = await db.get(Modifier, modifier_id)
    if not modifier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modificateur introuvable.",
        )
    return modifier


@router.put("/{modifier_id}", response_model=ModifierResponse)
async def update_modifier(
    modifier_id: uuid.UUID,
    modifier_in: ModifierUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    modifier = await db.get(Modifier, modifier_id)
    if not modifier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modificateur introuvable.",
        )

    update_data = modifier_in.model_dump(exclude_unset=True)

    if "group_id" in update_data and update_data["group_id"] is not None:
        group = await db.get(ModifierGroup, update_data["group_id"])
        if not group:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Le nouveau groupe spécifié n'existe pas.",
            )

    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(modifier, field, value)

    await db.commit()
    await db.refresh(modifier)
    return modifier


@router.delete("/{modifier_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_modifier(
    modifier_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    modifier = await db.get(Modifier, modifier_id)
    if not modifier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Modificateur introuvable.",
        )

    await db.delete(modifier)
    await db.commit()
    return None