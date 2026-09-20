import uuid
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert
from app.core.database import AsyncSessionLocal, engine, Base  # Ajuste selon ton import
from app.core.models import Category  # Ajuste selon l'emplacement de tes modèles

CATEGORIES_DATA = [
    {
        "name": "Fast-Food",
        "color_code": "#EF4444",  # Rouge
        "display_order": 1,
        "is_active": True,
    },
    {
        "name": "Grillades",
        "color_code": "#F97316",  # Orange
        "display_order": 2,
        "is_active": True,
    },
    {
        "name": "Jus",
        "color_code": "#10B981",  # Vert
        "display_order": 3,
        "is_active": True,
    },
    {
        "name": "Boissons",
        "color_code": "#3B82F6",  # Bleu
        "display_order": 4,
        "is_active": True,
    },
    {
        "name": "Crêpes",
        "color_code": "#F59E0B",  # Ambre / Jaune
        "display_order": 5,
        "is_active": True,
    },
    {
        "name": "Milk-Shake",
        "color_code": "#EC4899",  # Rose
        "display_order": 6,
        "is_active": True,
    },
    {
        "name": "Boissons Chaudes",  # Pour Thé, Cappuccino
        "color_code": "#8B5CF6",  # Violet
        "display_order": 7,
        "is_active": True,
    },
]


def seed_categories():
    db: Session = AsyncSessionLocal()
    try:
        print("🌱 Insertion des catégories...")
        
        for cat in CATEGORIES_DATA:
            # PostgreSQL upsert : évite les erreurs si le nom existe déjà
            stmt = insert(Category).values(
                id=uuid.uuid4(),
                name=cat["name"],
                color_code=cat["color_code"],
                display_order=cat["display_order"],
                is_active=cat["is_active"]
            )
            
            # Évite d'insérer en double si le nom existe déjà
            stmt = stmt.on_conflict_do_nothing(index_elements=['name'])
            db.execute(stmt)

        db.commit()
        print("✅ Catégories insérées avec succès !")

    except Exception as e:
        db.rollback()
        print(f"❌ Erreur lors de l'insertion : {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_categories()