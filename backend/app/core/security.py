import bcrypt
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from jose import jwt
from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def hash_password(password: str) -> str:
    """Hache un mot de passe ou un code PIN avec bcrypt natif."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Vérifie un mot de passe ou un code PIN avec bcrypt natif."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    except Exception:
        return False


def create_access_token(
    subject: uuid.UUID | str, 
    pos_id: Optional[uuid.UUID | str] = None, 
    expires_delta: Optional[timedelta] = None
) -> str:
    """Génère un token d'accès JWT."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "type": "access"
    }
    
    if pos_id:
        to_encode["pos_id"] = str(pos_id)

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)