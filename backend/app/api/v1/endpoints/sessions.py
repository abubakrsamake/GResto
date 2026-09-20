import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, status,HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models import RegisterSession, User

from app.schemas.register_session import SessionOpenRequest, SessionCloseRequest, RegisterSessionResponse
from datetime import datetime, timezone
from decimal import Decimal

router = APIRouter(tags=["Sessions"])


@router.get("/{session_id}", status_code=status.HTTP_200_OK)
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
    s = res.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    from sqlalchemy import select
    # Calcul du montant attendu (montant total des commandes ouvertes de cette session)
    from app.core.models import Order
    orders_stmt = select(Order).where(Order.register_session_id == sid, Order.status != "CANCELLED")
    orders_res = await db.execute(orders_stmt)
    orders = orders_res.scalars().all()
    expected = sum((o.total_ttc for o in orders), Decimal("0.00"))
    return {
        "id": str(s.id),
        "register_id": str(s.register_id),
        "opening_amount": float(s.opening_amount) if s.opening_amount else 0.0,
        "expected_amount": float(expected),
        "actual_amount": float(s.actual_amount) if s.actual_amount else None,
        "status": s.status,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "order_count": len(orders),
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
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
            detail="Une session est déjà ouverte pour cette caisse."
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
            detail="Impossible d'ouvrir la session pour cette caisse."
        )
    await db.refresh(session)
    return {
        "id": str(session.id),
        "register_id": str(session.register_id),
        "opening_amount": float(session.opening_amount),
        "status": session.status,
    }


@router.post("/close", status_code=status.HTTP_200_OK)
async def close_session(
    payload: dict,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    try:
        sid = uuid.UUID(payload.get("session_id") or payload.get("id"))
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="ID de session invalide")
    stmt = select(RegisterSession).where(RegisterSession.id == sid, RegisterSession.status == "OPEN")
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session ouverte non trouvée")
    session.status = "CLOSED"
    session.closing_time = datetime.now(timezone.utc)
    session.closed_by = current_user.id
    session.actual_amount = payload.actual_amount
    session.notes = payload.notes
    # Calcul du montant attendu (total des commandes de cette session)
    from app.core.models import Order
    orders_stmt = select(Order).where(Order.register_session_id == sid, Order.status != "CANCELLED")
    orders_res = await db.execute(orders_stmt)
    orders = orders_res.scalars().all()
    expected = sum((o.total_ttc for o in orders), Decimal("0.00"))
    session.expected_amount = expected
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de clôturer cette session."
        )
    await db.refresh(session)
    return {
        "id": str(session.id),
        "status": session.status,
        "expected_amount": float(session.expected_amount) if session.expected_amount else 0.0,
        "actual_amount": float(session.actual_amount) if session.actual_amount else 0.0,
        "closing_time": session.closing_time.isoformat() if session.closing_time else None,
    }


@router.get("/", status_code=status.HTTP_200_OK)
async def list_open_sessions(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    stmt = select(RegisterSession).where(RegisterSession.status == "OPEN")
    result = await db.execute(stmt)
    sessions = result.scalars().all()
    return [
        {
            "id": str(s.id),
            "register_id": str(s.register_id),
            "opening_amount": float(s.opening_amount) if s.opening_amount else 0.0,
            "expected_amount": float(s.expected_amount) if s.expected_amount else None,
            "actual_amount": float(s.actual_amount) if s.actual_amount else None,
            "status": s.status,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in sessions
    ]
