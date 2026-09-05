from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt

from app.core.config import settings


def validate_password_strength(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes")
    if len(password) < 8:
        raise ValueError("Password must contain at least 8 characters")
    if not any(character.isupper() for character in password):
        raise ValueError("Password must contain an uppercase letter")
    if not any(character.islower() for character in password):
        raise ValueError("Password must contain a lowercase letter")
    if not any(character.isdigit() for character in password):
        raise ValueError("Password must contain a number")
    if not any(not character.isalnum() for character in password):
        raise ValueError("Password must contain a special character")
    return password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
        )
    except (TypeError, ValueError):
        return False


def get_password_hash(password: str) -> str:
    encoded = validate_password_strength(password).encode("utf-8")
    return bcrypt.hashpw(encoded, bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
        to_encode.update({"exp": expire})
    elif settings.ACCESS_TOKEN_EXPIRE_MINUTES > 0:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
        to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
