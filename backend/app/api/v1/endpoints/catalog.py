import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError
from io import BytesIO
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.core.models import ModifierGroup, Product, ProductVariant, Category
from app.core.dependencies import get_current_user, require_roles

# Importation directe de vos schémas catalog.py
from app.schemas.catalog import (
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    CategoryResponse,
)

router = APIRouter(tags=["Catalogue"])

PRODUCT_MEDIA_DIR = Path(__file__).resolve().parents[4] / "media" / "products"
PRODUCT_MEDIA_DIR.mkdir(parents=True, exist_ok=True)
MAX_IMAGE_SIZE = 5 * 1024 * 1024
MAX_IMAGE_DIMENSION = 1200
ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}


def normalize_uploaded_image(content: bytes, content_type: str) -> tuple[bytes, str]:
    """Redimensionne et compresse une image pour garder un rendu propre et léger."""
    with Image.open(BytesIO(content)) as image:
        image = ImageOps.exif_transpose(image)

        if image.mode in {"RGBA", "LA", "P"}:
            background = Image.new("RGBA", image.size, (255, 255, 255, 255))
            image = Image.alpha_composite(background, image).convert("RGB")
        elif image.mode not in {"RGB", "L", "CMYK"}:
            image = image.convert("RGB")

        image.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION), Image.Resampling.LANCZOS)

        output = BytesIO()
        image.save(output, format="JPEG", quality=82, optimize=True)
        return output.getvalue(), ".jpg"


# Helper pour réutiliser les options de chargement eager
def get_product_options():
    return [
        selectinload(Product.category),
        selectinload(Product.modifier_groups).selectinload(ModifierGroup.modifiers),
        selectinload(Product.variants),
    ]

# --- Endpoints Catégories ---

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Tri par ordre d'affichage
    stmt = select(Category).where(Category.is_active == True).order_by(Category.display_order.asc())
    result = await db.execute(stmt)
    return result.scalars().all()

# --- Endpoints Produits ---

@router.get("", response_model=List[ProductResponse])
@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    category_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = select(Product).options(*get_product_options()).where(Product.is_active == True)
    
    if category_id:
        stmt = stmt.where(Product.category_id == category_id)

    result = await db.execute(stmt)
    return result.scalars().unique().all()

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    product_in: ProductCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    # 1. Vérification de la catégorie
    category = await db.get(Category, product_in.category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La catégorie spécifiée n'existe pas.",
        )

    variant_names = [variant.name.strip().casefold() for variant in product_in.variants]
    if len(variant_names) != len(set(variant_names)):
        raise HTTPException(status_code=400, detail="Les noms de variantes doivent être uniques.")

    # 2. Création de l'instance du produit
    product_data = product_in.model_dump(exclude={"modifier_group_ids", "variants"})
    new_product = Product(**product_data)
    new_product.variants = [
        ProductVariant(name=variant.name.strip(), price_override=variant.price_override)
        for variant in product_in.variants
    ]
    
    db.add(new_product)
    await db.flush()  # Génère l'ID en base sans finaliser la transaction

    # 3. Association des groupes de modificateurs dans la table de liaison
    if product_in.modifier_group_ids:
        groups_stmt = select(ModifierGroup).where(ModifierGroup.id.in_(product_in.modifier_group_ids))
        groups_result = await db.execute(groups_stmt)
        new_product.modifier_groups = list(groups_result.scalars().all())

    await db.commit()

    # 4. Chargement complet pour le retour API avec relations
    result = await db.execute(
        select(Product)
        .options(*get_product_options())
        .where(Product.id == new_product.id)
    )
    return result.scalar_one()


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product_by_id(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    stmt = (
        select(Product)
        .options(*get_product_options())
        .where(Product.id == product_id)
    )
    result = await db.execute(stmt)
    product = result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable.")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    product_in: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    result = await db.execute(
        select(Product)
        .options(*get_product_options())
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable.")

    update_data = product_in.model_dump(exclude_unset=True)
    variants = product_in.variants if "variants" in update_data else None
    update_data.pop("variants", None)
    
    # Traitement de la relation Many-to-Many
    if "modifier_group_ids" in update_data:
        group_ids = update_data.pop("modifier_group_ids")
        if group_ids is not None:
            if len(group_ids) > 0:
                groups_stmt = select(ModifierGroup).where(ModifierGroup.id.in_(group_ids))
                groups_result = await db.execute(groups_stmt)
                product.modifier_groups = list(groups_result.scalars().all())
            else:
                product.modifier_groups = []  # Vider les groupes si un tableau vide est transmis

    if variants is not None:
        variant_names = [variant.name.strip().casefold() for variant in variants]
        if len(variant_names) != len(set(variant_names)):
            raise HTTPException(status_code=400, detail="Les noms de variantes doivent être uniques.")
        product.variants = [
            ProductVariant(name=variant.name.strip(), price_override=variant.price_override)
            for variant in variants
        ]
    
    # Mise à jour des autres champs scalaires
    for field, value in update_data.items():
        if isinstance(value, str):
            value = value.strip()
            if value == "":
                value = None
        setattr(product, field, value)

    await db.commit()

    # Recharge le produit pour vérifier l'état final
    updated_result = await db.execute(
        select(Product)
        .options(*get_product_options())
        .where(Product.id == product_id)
    )
    return updated_result.scalar_one()


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable.")

    await db.delete(product)
    await db.commit()
    return None


@router.post("/products/{product_id}/image", response_model=ProductResponse)
async def upload_product_image(
    product_id: uuid.UUID,
    request: Request,
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_roles(["ADMIN", "MANAGER", "SUPERADMIN"])),
):
    """Valide et stocke l'image d'un produit dans le dossier média local."""
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Format accepté: JPG, PNG, WEBP ou GIF.")

    content = await image.read(MAX_IMAGE_SIZE + 1)
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="L'image ne doit pas dépasser 5 Mo.")

    try:
        with Image.open(BytesIO(content)) as validated_image:
            validated_image.verify()
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status_code=400, detail="Le fichier envoyé n'est pas une image valide.")

    try:
        normalized_content, normalized_ext = normalize_uploaded_image(content, image.content_type)
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="L'image ne peut pas être traitée automatiquement.")

    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable.")

    filename = f"{product_id}_{uuid.uuid4().hex}{normalized_ext}"
    target = PRODUCT_MEDIA_DIR / filename
    target.write_bytes(normalized_content)

    product.image_url = f"{str(request.base_url).rstrip('/')}/media/products/{filename}"
    await db.commit()
    result = await db.execute(
        select(Product)
        .options(*get_product_options())
        .where(Product.id == product_id)
    )
    return result.scalar_one()