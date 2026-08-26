from typing import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.permissions import (
    LEGACY_RECEPTIONIST_PERMISSION_MAP,
    PermissionLike,
    permission_value,
)
from app.core.roles import RoleLike, normalize_role, role_satisfies_any
from app.database import get_db
from app.models.all_models import User
from app.services.authorization import user_has_permission


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        user_id = int(user_id)
    except (JWTError, TypeError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been disabled.",
        )
    return user


class RoleChecker:
    """Backward-compatible role dependency with administrative inheritance."""

    def __init__(self, allowed_roles: Iterable[RoleLike]):
        self.allowed_roles = tuple(normalize_role(role) for role in allowed_roles)
        if not self.allowed_roles:
            raise ValueError("At least one allowed role is required")

    def __call__(self, current_user: User = Depends(get_current_user)):
        if not role_satisfies_any(current_user.role, self.allowed_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for this role",
            )
        return current_user


class PermissionChecker:
    """Central permission dependency; legacy receptionist keys remain supported."""

    def __init__(self, required_permission: PermissionLike):
        raw_permission = str(
            required_permission.value
            if hasattr(required_permission, "value")
            else required_permission
        )
        raw_permission = LEGACY_RECEPTIONIST_PERMISSION_MAP.get(
            raw_permission, raw_permission
        )
        self.required_permission = permission_value(raw_permission)

    def __call__(
        self,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ):
        if not user_has_permission(current_user, self.required_permission, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {self.required_permission}",
            )
        return current_user


def require_role(role: RoleLike) -> RoleChecker:
    return RoleChecker([role])


def require_any_role(*roles: RoleLike) -> RoleChecker:
    return RoleChecker(roles)


def require_permission(permission: PermissionLike) -> PermissionChecker:
    return PermissionChecker(permission)
