from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import engine, Base
from app.core.exception_handler import register_exception_handlers
from app.api.v1.router import router as v1_router

# --- 1. LIFESPAN / CRÉATION DES TABLES ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Demarrage du serveur POS Backend...")
    if settings.AUTO_CREATE_SCHEMA:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    yield
    print("Arret du serveur POS Backend...")

app = FastAPI(
    title="Terminal POS & KDS API",
    version="1.0.0",
    description="Backend FastAPI pour caisse enregistreuse tactile, gestion KDS et impression ESC/POS.",
    lifespan=lifespan
)

MEDIA_DIR = Path(__file__).resolve().parent / "media"
MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

origins = settings.BACKEND_CORS_ORIGINS

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],    # Autorise GET, POST, PUT, DELETE, OPTIONS, etc.
    allow_headers=["*"],    # Autorise Authorization, Content-Type, etc.
)

register_exception_handlers(app)

# --- 4. ROUTES REST ---
app.include_router(v1_router, prefix="/api/v1")

# --- 5. HEALTH ---
@app.get("/health", tags=["Système"])
def health_check():
    return {"status": "ok", "service": "POS Backend FastAPI"}
