import uuid
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import ALGORITHM, SECRET_KEY
from datetime import datetime, timezone
from app.core.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """Injecte l'utilisateur courant à partir du token JWT Bearer."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Identifiants de connexion invalides ou expirés.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub: str = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id = uuid.UUID(sub)  # ✅ Conversion en UUID pour match DB
    except (JWTError, ValueError):
        raise credentials_exception

    # Récupère l'utilisateur avec son rôle et ses accès POS
    stmt = (
        select(User)
        .options(selectinload(User.role), selectinload(User.points_of_sale))
        .where(User.id == user_id, User.is_active == True)
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    user.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user, attribute_names=["updated_at", "last_seen_at"])
    return user


async def heartbeat(current_user: Annotated[User, Depends(get_current_user)]) -> dict[str, bool]:
    return {"ok": True}


def require_roles(allowed_roles: list[str]):
    """Vérifie que l'utilisateur connecté possède un des rôles autorisés."""
    async def role_checker(current_user: Annotated[User, Depends(get_current_user)]) -> User:
        if not current_user.role or current_user.role.code not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes pour effectuer cette action."
            )
        return current_user
    return role_checker