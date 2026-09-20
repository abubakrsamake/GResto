import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.models import User  # Ajusté selon vos conventions d'importation
from app.core.security import verify_password

router = APIRouter()


# ==========================================
# 1. SCHÉMAS PYDANTIC
# ==========================================

class PINLoginRequest(BaseModel):
    pin_code: str = Field(..., min_length=4, max_length=6, description="Code PIN du caissier")


class CashierResponse(BaseModel):
    id: uuid.UUID  # Remplacé par UUID pour matcher la structure de la BDD
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str

    class Config:
        from_attributes = True


# ==========================================
# 2. ENDPOINT ASYNCHRONE
# ==========================================

@router.post("/verify-pin", response_model=CashierResponse)
async def verify_cashier_pin(
    payload: PINLoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Vérifie le code PIN d'un caissier/serveur pour un accès rapide sur l'écran tactile.
    """
    if not payload.pin_code or len(payload.pin_code.strip()) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le code PIN doit contenir au moins 4 chiffres."
        )

    stmt = select(User).options(selectinload(User.role)).where(
        User.is_active == True,
        User.pin_code.is_not(None),
    )
    result = await db.execute(stmt)
    user = next(
        (candidate for candidate in result.scalars().all()
         if candidate.pin_code and verify_password(payload.pin_code, candidate.pin_code)),
        None,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Code PIN invalide ou caissier inactif."
        )

    return {
        "id": user.id,
        "username": user.email or str(user.id),
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role.code if user.role else "",
    }