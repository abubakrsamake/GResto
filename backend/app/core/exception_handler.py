from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
import traceback


class GRestaurantException(Exception):
    """Exception personnalisée pour GRestaurant avec code et message."""
    def __init__(self, message: str, code: int = 500, detail: dict | None = None):
        self.message = message
        self.code = code
        self.detail = detail or {}
        super().__init__(message)

def _database_error_message(exc: Exception) -> tuple[int, str]:
    raw = str(exc).lower()

    if "duplicate" in raw or "unique constraint" in raw or "already exists" in raw:
        if "email" in raw:
            return 409, "Un utilisateur avec cet email existe déjà."
        if "phone" in raw:
            return 409, "Un utilisateur avec ce numéro de téléphone existe déjà."
        return 409, "Une donnée unique est déjà présente en base."

    if "foreign key" in raw or "not present in table" in raw:
        return 400, "Une référence associée est introuvable."

    if "not null" in raw:
        return 400, "Un champ obligatoire est manquant."

    if "check constraint" in raw:
        return 400, "Une valeur fournie ne respecte pas les règles métier."

    return 500, "Une erreur de base de données est survenue."


def register_exception_handlers(app: FastAPI):
    @app.exception_handler(GRestaurantException)
    async def handle_grestaurant_exception(request: Request, exc: GRestaurantException):
        return JSONResponse(
            status_code=exc.code,
            content={
                "error": "GRestaurantError",
                "message": exc.message,
                "code": exc.code,
                "detail": exc.detail,
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": "HTTPException",
                "message": exc.detail,
                "code": exc.status_code,
            },
        )

    @app.exception_handler(IntegrityError)
    async def handle_integrity_error(request: Request, exc: IntegrityError):
        status_code, message = _database_error_message(exc)
        return JSONResponse(
            status_code=status_code,
            content={
                "error": "IntegrityError",
                "message": message,
                "code": status_code,
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def handle_sqlalchemy_error(request: Request, exc: SQLAlchemyError):
        status_code, message = _database_error_message(exc)
        return JSONResponse(
            status_code=status_code,
            content={
                "error": "DatabaseError",
                "message": message,
                "code": status_code,
            },
        )

    @app.exception_handler(Exception)
    async def handle_generic_exception(request: Request, exc: Exception):
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={
                "error": "InternalServerError",
                "message": "Une erreur interne est survenue. Contactez l'admin.",
                "code": 500,
                "reference": getattr(request.state, "request_id", "N/A"),
            },
        )
