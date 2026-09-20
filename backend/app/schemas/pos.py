import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ==========================================
# 1. POINT DE VENTE (POS / Etablissement)
# ==========================================

class PointOfSaleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Nom de l'établissement ou zone de vente")
    address: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: bool = True


class PointOfSaleCreate(PointOfSaleBase):
    pass


class PointOfSaleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class PointOfSaleResponse(PointOfSaleBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 2. REGISTRE / CAISSE PHYSIQUE (Register)
# ==========================================

class RegisterBase(BaseModel):
    name: str = Field(..., description="Ex: Caisse Principale, Caisse Bar 1")
    pos_id: uuid.UUID
    is_active: bool = True


class RegisterCreate(RegisterBase):
    pass


class RegisterResponse(RegisterBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. SESSIONS DE CAISSE (RegisterSession)
# ==========================================

class OpenSessionRequest(BaseModel):
    register_id: uuid.UUID
    opening_amount: Decimal = Field(default=Decimal("0.00"), ge=Decimal("0.00"), description="Fond de caisse initial")


class CloseSessionRequest(BaseModel):
    actual_amount: Decimal = Field(..., ge=Decimal("0.00"), description="Montant total réel compté à la fermeture")
    notes: Optional[str] = Field(None, max_length=500, description="Remarques éventuelles sur les écarts")


class RegisterSessionBase(BaseModel):
    register_id: uuid.UUID
    opened_by: uuid.UUID
    opening_time: datetime
    opening_amount: Decimal
    status: str = Field("OPEN", description="Statut: OPEN, CLOSED")
    notes: Optional[str] = None


class RegisterSessionResponse(RegisterSessionBase):
    id: uuid.UUID
    closed_by: Optional[uuid.UUID] = None
    closing_time: Optional[datetime] = None
    expected_amount: Optional[Decimal] = Field(None, description="Montant théorique calculé par le système")
    actual_amount: Optional[Decimal] = Field(None, description="Montant réel déclaré à la fermeture")

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 4. TABLES EN SALLE (DiningTable)
# ==========================================

class DiningTableBase(BaseModel):
    pos_id: uuid.UUID
    table_number: str = Field(..., min_length=1, max_length=20, description="Ex: T01, Table 12, VIP")
    capacity: int = Field(default=2, ge=1, description="Nombre de places assises")
    status: str = Field("AVAILABLE", description="Statut: AVAILABLE, OCCUPIED, RESERVED")


class DiningTableCreate(DiningTableBase):
    pass


class UpdateTableStatusRequest(BaseModel):
    status: str = Field(..., description="Nouveau statut : AVAILABLE, OCCUPIED, RESERVED")


class DiningTableResponse(DiningTableBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)