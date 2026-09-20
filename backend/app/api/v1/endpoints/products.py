import uuid
from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.core.models import Product, Category, User

router = APIRouter(tags=["Catalogue & Produits"])


# ==========================================
# 1. SCHÉMAS PYDANTIC (v2)
# ==========================================

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    category_id: Optional[uuid.UUID] = None
    base_price: float = Field(..., ge=0.0)
    tax_rate: Optional[float] = Field(default=0.0, ge=0.0)
    is_available: bool = True
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category_id: Optional[uuid.UUID] = None
    base_price: Optional[float] = Field(None, ge=0.0)
    tax_rate: Optional[float] = Field(None, ge=0.0)
    is_available: Optional[bool] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 2. ENDPOINTS ASYNCHRONES
# ==========================================

@router.get("/", response_model=List[ProductResponse])
async def list_products(
    db: Annotated[AsyncSession, Depends(get_db)],
    category_id: Optional[uuid.UUID] = Query(None, description="Filtrer par catégorie"),
    search: Optional[str] = Query(None, description="Recherche par nom"),
    include_inactive: bool = Query(False, description="Inclure les produits désactivés")
):
    """
    Récupère tous les produits avec filtrage optionnel par catégorie et recherche textuelle.
    """
    stmt = select(Product)

    if not include_inactive:
        stmt = stmt.where(Product.is_active == True)

    if category_id:
        stmt = stmt.where(Product.category_id == category_id)

    if search:
        stmt = stmt.where(Product.name.ilike(f"%{search}%"))

    stmt = stmt.order_by(Product.name.asc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)]
):
    """
    Récupère les détails d'un produit spécifique par son ID.
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit introuvable."
        )
    return product


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    payload: ProductCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["ADMIN", "MANAGER"]))]
):
    """
    Crée un nouveau produit dans le catalogue (accès réservé ADMIN/MANAGER).
    """
    # Vérification si la catégorie existe (si renseignée)
    if payload.category_id:
        category = await db.get(Category, payload.category_id)
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La catégorie spécifiée n'existe pas."
            )

    new_product = Product(
        id=uuid.uuid4(),
        **payload.model_dump()
    )

    db.add(new_product)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un produit avec ces données existe déjà ou une contrainte métier est violée."
        )
    await db.refresh(new_product)

    return new_product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    payload: ProductUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["ADMIN", "MANAGER"]))]
):
    """
    Met à jour un produit existant (mise à jour partielle supportée).
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit introuvable."
        )

    update_data = payload.model_dump(exclude_unset=True)

    # Vérification de la catégorie si elle est modifiée
    if "category_id" in update_data and update_data["category_id"] is not None:
        category = await db.get(Category, update_data["category_id"])
        if not category:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La catégorie spécifiée n'existe pas."
            )

    for field, value in update_data.items():
        setattr(product, field, value)

    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de mettre à jour le produit. Vérifiez les données uniques ou la catégorie."
        )
    await db.refresh(product)

    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_roles(["ADMIN"]))]
):
    """
    Supprime un produit (ou le marque comme inactif en soft-delete).
    """
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produit introuvable."
        )

    # Soft delete (recommandé pour ne pas briser l'historique des anciennes commandes)
    product.is_active = False
    
    # Si vous préférez une suppression physique de la BDD :
    # await db.delete(product)

    await db.commit()
    return None