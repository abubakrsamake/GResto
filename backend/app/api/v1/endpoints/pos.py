import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.models import DiningTable, PointOfSale, Register, RegisterSession, User

router = APIRouter(tags=["POS & Sessions de Caisse"])


# ==========================================
# 1. SCHÉMAS PYDANTIC (Validation & Sérialisation)
# ==========================================

class PointOfSaleSchema(BaseModel):
    id: uuid.UUID
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class OpenSessionRequest(BaseModel):
    register_id: uuid.UUID
    opening_amount: Decimal = Field(default=Decimal("0.00"), ge=0)


class CloseSessionRequest(BaseModel):
    actual_amount: Decimal = Field(..., ge=0)  # Montant compté en caisse à la fermeture
    notes: Optional[str] = None


class RegisterSessionSchema(BaseModel):
    id: uuid.UUID
    register_id: uuid.UUID
    opened_by: uuid.UUID
    closed_by: Optional[uuid.UUID] = None
    opening_time: datetime
    closing_time: Optional[datetime] = None
    opening_amount: Decimal
    expected_amount: Optional[Decimal] = None
    actual_amount: Optional[Decimal] = None
    status: str
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DiningTableSchema(BaseModel):
    id: uuid.UUID
    pos_id: uuid.UUID
    table_number: str
    capacity: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class UpdateTableStatusRequest(BaseModel):
    status: str  # Exemple: "AVAILABLE", "OCCUPIED", "RESERVED"


# ==========================================
# 2. ENDPOINTS : TERMINAUX & POINTS DE VENTE
# ==========================================

@router.get("/", response_model=List[PointOfSaleSchema])
async def get_points_of_sale(
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Récupère la liste de tous les points de vente actifs.
    """
    stmt = select(PointOfSale).where(PointOfSale.is_active == True)
    result = await db.execute(stmt)
    return result.scalars().all()


# ==========================================
# 3. ENDPOINTS : SESSIONS DE CAISSE (RegisterSession)
# ==========================================

@router.post("/session/open", response_model=RegisterSessionSchema, status_code=status.HTTP_201_CREATED)
async def open_register_session(
    payload: OpenSessionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Ouvre une nouvelle session de caisse avec le fond de caisse initial.
    Le caissier connecté est automatiquement associé via `current_user`.
    """
    # 1. Vérifier si le registre/caisse existe
    register = await db.get(Register, payload.register_id)
    if not register:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registre de caisse non trouvé."
        )

    role_code = getattr(current_user.role, "code", None)
    if role_code not in {"ADMIN", "SUPERADMIN"} and register.pos_id not in {
        pos.id for pos in current_user.points_of_sale
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Caisse inaccessible pour cet utilisateur.")

    # 2. Vérifier s'il y a déjà une session ouverte sur cette caisse
    stmt = select(RegisterSession).where(
        RegisterSession.register_id == payload.register_id,
        RegisterSession.status == "OPEN"
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Une session est déjà ouverte sur cette caisse."
        )

    # 3. Création de la session
    new_session = RegisterSession(
        id=uuid.uuid4(),
        register_id=payload.register_id,
        opened_by=current_user.id,
        opening_amount=payload.opening_amount,
        status="OPEN"
    )
    db.add(new_session)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible d'ouvrir la session de caisse. Vérifiez les données fournies."
        )
    await db.refresh(new_session)

    return new_session


@router.post("/session/{session_id}/close", response_model=RegisterSessionSchema)
async def close_register_session(
    session_id: uuid.UUID,
    payload: CloseSessionRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Clôture la session de caisse en enregistrant le montant réel compté.
    L'utilisateur fermant la caisse est extrait du jeton d'authentification (`current_user`).
    """
    stmt = select(RegisterSession).options(selectinload(RegisterSession.register)).where(
        RegisterSession.id == session_id,
        RegisterSession.status == "OPEN"
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session de caisse active non trouvée."
        )

    role_code = getattr(current_user.role, "code", None)
    if role_code not in {"ADMIN", "SUPERADMIN"} and session.register.pos_id not in {
        pos.id for pos in current_user.points_of_sale
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Session inaccessible pour cet utilisateur.")

    session.closed_by = current_user.id
    session.closing_time = datetime.now(timezone.utc)
    session.actual_amount = payload.actual_amount
    session.notes = payload.notes
    session.status = "CLOSED"

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de clôturer la session de caisse."
        )
    await db.refresh(session)

    return session


@router.get("/session/active/{register_id}", response_model=Optional[RegisterSessionSchema])
async def get_active_session(
    register_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Récupère la session actuellement ouverte pour une caisse donnée.
    """
    stmt = select(RegisterSession).where(
        RegisterSession.register_id == register_id,
        RegisterSession.status == "OPEN"
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ==========================================
# 4. ENDPOINTS : TABLES EN SALLE (DiningTable)
# ==========================================

@router.get("/tables/{pos_id}", response_model=List[DiningTableSchema])
async def get_tables_by_pos(
    pos_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Récupère le plan de salle / la liste des tables associées à un Point de Vente.
    """
    stmt = select(DiningTable).where(DiningTable.pos_id == pos_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/tables/{table_id}/status", response_model=DiningTableSchema)
async def update_table_status(
    table_id: uuid.UUID,
    payload: UpdateTableStatusRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Met à jour le statut d'une table (ex: "AVAILABLE", "OCCUPIED", "RESERVED").
    """
    table = await db.get(DiningTable, table_id)
    if not table:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Table non trouvée."
        )

    role_code = getattr(current_user.role, "code", None)
    if role_code not in {"ADMIN", "SUPERADMIN"} and table.pos_id not in {
        pos.id for pos in current_user.points_of_sale
    }:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Table inaccessible pour cet utilisateur.")

    allowed_statuses = {"AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"}
    if payload.status not in allowed_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Statut de table invalide. Valeurs autorisées: AVAILABLE, OCCUPIED, RESERVED, CLEANING."
        )

    table.status = payload.status
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Impossible de mettre à jour le statut de la table."
        )
    await db.refresh(table)

    return table