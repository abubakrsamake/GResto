# backend/app/api/v1/endpoints/auth.py
import uuid
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import Annotated

from app.core.database import get_db
from app.core.dependencies import get_current_user, heartbeat
from app.core.security import create_access_token, hash_password, verify_password
from datetime import datetime, timezone
from app.core.models import User, PointOfSale, Role
from app.schemas.user_pos import UserResponse, PinLoginRequest

router = APIRouter(prefix="/auth", tags=["Authentification"])


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    active_pos_id: str | None = None


# ----------------------------------------------------------------------------
# 1. LOGIN CLASSIQUE (Email + Mot de passe - Backoffice Admin / Manager)
# ----------------------------------------------------------------------------
@router.post("/login", response_model=TokenResponse)
async def login_email(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    stmt = (
        select(User)
        .options(selectinload(User.role), selectinload(User.points_of_sale))
        .where(User.email == form_data.username, User.is_active == True)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(subject=str(user.id))
    user.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user, attribute_names=["updated_at", "last_seen_at"])

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )


# ----------------------------------------------------------------------------
# 2. LOGIN RAPIDE PAR CODE PIN (Caisse POS)
# ----------------------------------------------------------------------------
@router.post("/login-pin", response_model=TokenResponse)
async def login_pin(
    payload: PinLoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    # 1. Vérifier que le point de vente existe et est actif
    pos_stmt = select(PointOfSale).where(PointOfSale.id == payload.pos_id, PointOfSale.is_active == True)
    pos_result = await db.execute(pos_stmt)
    pos = pos_result.scalar_one_or_none()

    if not pos:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Point de vente introuvable ou inactif."
        )

    # 2. Récupérer uniquement les CAISSIERS rattachés à ce Point de Vente
    stmt = (
        select(User)
        .join(User.role)
        .join(User.points_of_sale)
        .options(selectinload(User.role), selectinload(User.points_of_sale))
        .where(
            User.is_active == True,
            Role.code == "CASHIER",
            PointOfSale.id == payload.pos_id
        )
    )
    result = await db.execute(stmt)
    cashiers = result.scalars().unique().all()

    # 3. Vérifier le PIN sans choisir silencieusement le premier vendeur.
    matching_cashiers = [
        cashier for cashier in cashiers
        if cashier.pin_code and (
            verify_password(payload.pin_code, cashier.pin_code)
            or cashier.pin_code == payload.pin_code
        )
    ]

    if payload.user_id:
        matching_cashiers = [user for user in matching_cashiers if user.id == payload.user_id]
    if payload.email:
        matching_cashiers = [user for user in matching_cashiers if user.email == payload.email]

    if len(matching_cashiers) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ce PIN est partagé par plusieurs vendeurs. Sélectionnez votre vendeur et renvoyez son user_id.",
        )

    authenticated_user: User | None = matching_cashiers[0] if matching_cashiers else None

    # Si aucun caissier ne matche, autoriser le SuperAdmin sur le POS en secours
    if not authenticated_user:
        admin_stmt = (
            select(User)
            .join(User.role)
            .options(selectinload(User.role), selectinload(User.points_of_sale))
            .where(User.is_active == True, Role.code == "SUPERADMIN")
        )
        admin_result = await db.execute(admin_stmt)
        admins = admin_result.scalars().unique().all()
        matching_admins = [
            admin for admin in admins
            if admin.pin_code and (
                verify_password(payload.pin_code, admin.pin_code)
                or admin.pin_code == payload.pin_code
            )
        ]
        if payload.user_id:
            matching_admins = [user for user in matching_admins if user.id == payload.user_id]
        if payload.email:
            matching_admins = [user for user in matching_admins if user.email == payload.email]
        if len(matching_admins) > 1:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Ce PIN est partagé par plusieurs utilisateurs. Sélectionnez votre utilisateur.",
            )
        authenticated_user = matching_admins[0] if matching_admins else None

    if not authenticated_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code PIN incorrect ou aucun caissier associé à ce point de vente."
        )

    # 4. Générer le Token JWT
    access_token = create_access_token(
        subject=str(authenticated_user.id),
        pos_id=str(payload.pos_id)
    )
    authenticated_user.last_seen_at = datetime.now(timezone.utc)
    if authenticated_user.pin_code == payload.pin_code:
        authenticated_user.pin_code = hash_password(payload.pin_code)
    await db.commit()
    await db.refresh(authenticated_user, attribute_names=["updated_at", "last_seen_at"])

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(authenticated_user),
        active_pos_id=str(payload.pos_id)
    )


# ----------------------------------------------------------------------------
# 3. PROFIL / UTILISATEUR CONNECTÉ (/me)
# ----------------------------------------------------------------------------
@router.get("/me", response_model=UserResponse)
async def read_current_user(
    current_user: Annotated[User, Depends(get_current_user)]
):
    return UserResponse.model_validate(current_user)


@router.post("/heartbeat")
async def user_heartbeat(
    heartbeat_result: Annotated[dict[str, bool], Depends(heartbeat)],
):
    return heartbeat_result


@router.post("/logout")
async def logout(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Marque la présence de l'utilisateur comme hors ligne."""
    current_user.last_seen_at = None
    await db.commit()
    return {"ok": True}