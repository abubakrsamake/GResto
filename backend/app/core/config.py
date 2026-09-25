from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str
    DB_ECHO: bool = False
    AUTO_CREATE_SCHEMA: bool = False

    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    API_V1_STR: str = "/api/v1"
    API_URL: str = "http://127.0.0.1:8000/api/v1"
    LOG_LEVEL: str = "info"

    DEFAULT_ADMIN_PASSWORD: str = Field(..., min_length=8)
    BACKEND_CORS_ORIGINS: list[str] = []

    model_config = SettingsConfigDict(env_file=".env", extra="ignore", case_sensitive=True)

settings = Settings()