import uuid
from typing import Annotated, List
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models import RegisterSession, User, Order

from app.schemas.register_session import (
    SessionOpenRequest,
    SessionCloseRequest,
    RegisterSessionResponse,
)

router = APIRouter(tags=["Sessions"])


@router.get(
    "/{session_id}",
    response_model=RegisterSessionResponse,
    status_code=status.HTTP_200_OK,
)
async def get_session(
    session_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        sid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="ID de session invalide")

    stmt = select(RegisterSession).where(RegisterSession.id == sid)
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    # Calcul du montant attendu
    orders_stmt = select(Order).where(
        Order.register_session_id == sid, Order.status != "CANCELLED"
    )
    orders_res = await db.execute(orders_stmt)
    orders = orders_res.scalars().all()
    
    # On peut attacher directement les valeurs dynamiques à l'objet ORM avant validation Pydantic
    session.expected_amount = sum((o.total_ttc for o in orders), Decimal("0.00"))
    session.order_count = len(orders)

    return session


@router.post(
    "/",
    response_model=RegisterSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def open_session(
    payload: SessionOpenRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    existing = await db.execute(
        select(RegisterSession).where(
            RegisterSession.register_id == payload.register_id,
            RegisterSession.status == "OPEN",
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une session est déjà ouverte pour cette caisse.",
        )

    session = RegisterSession(
        id=uuid.uuid4(),
        register_id=payload.register_id,
        opened_by=current_user.id,
        opening_amount=payload.opening_amount,
        status="OPEN",
    )
    db.add(session)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'ouvrir la session pour cette caisse.",
        )
    await db.refresh(session)
    return session


@router.post(
    "/close",
    response_model=RegisterSessionResponse,
    status_code=status.HTTP_200_OK,
)
async def close_session(
    payload: SessionCloseRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    session_uuid = payload.session_id

    stmt = select(RegisterSession).where(
        RegisterSession.id == session_uuid,
        RegisterSession.status == "OPEN",
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Session ouverte non trouvée."
        )

    # 1. Calcul du montant total attendu
    orders_stmt = select(
        func.coalesce(func.sum(Order.total_ttc), Decimal("0.00"))
    ).where(
        Order.register_session_id == session_uuid,
        Order.status != "CANCELLED",
    )
    orders_res = await db.execute(orders_stmt)
    expected = orders_res.scalar()

    # 2. Mise à jour des données (utilisez utcnow sans tzinfo si le champ PostgreSQL est TIMESTAMP WITHOUT TIME ZONE)
    session.status = "CLOSED"
    session.closing_time = datetime.now(timezone.utc).replace(tzinfo=None)
    session.closed_by = current_user.id
    session.actual_amount = payload.actual_amount
    session.notes = payload.notes

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        # On remonte l'erreur exacte dans la réponse de développement
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Erreur de clôture BDD: {str(e)}",
        )

    # 3. Réaffectation manuelle de expected_amount pour la réponse Pydantic
    session.expected_amount = expected

    return session


@router.get(
    "/",
    response_model=List[RegisterSessionResponse],
    status_code=status.HTTP_200_OK,
)
async def list_open_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    stmt = select(RegisterSession).where(RegisterSession.status == "OPEN")
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return sessions