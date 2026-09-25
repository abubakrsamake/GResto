from typing import Annotated
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models import Register, User

router = APIRouter()


@router.get("/", status_code=status.HTTP_200_OK)
async def list_registers(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    stmt = select(Register).where(Register.is_active == True)
    result = await db.execute(stmt)
    registers = result.scalars().all()
    
    return [
        {
            "id": str(r.id),
            "name": r.name,
            "is_active": r.is_active,
        }
        for r in registers
    ]