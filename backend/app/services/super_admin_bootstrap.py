"""Idempotent, environment-driven Super Admin bootstrap."""

from dataclasses import dataclass
from datetime import datetime, timezone

from pydantic import EmailStr, TypeAdapter
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.roles import UserRole
from app.core.security import (
    get_password_hash,
    validate_password_strength,
    verify_password,
)
from app.database import SessionLocal
from app.models.all_models import User


@dataclass(frozen=True)
class BootstrapResult:
    user_id: int
    created: bool
    password_synchronized: bool


def _validated_credentials(
    *, email: str | None, password: str | None, name: str | None
) -> tuple[str, str, str]:
    missing = [
        key
        for key, value in (
            ("SUPER_ADMIN_EMAIL", email),
            ("SUPER_ADMIN_PASSWORD", password),
            ("SUPER_ADMIN_NAME", name),
        )
        if not value
    ]
    if missing:
        raise RuntimeError(
            "Missing required Super Admin environment variables: "
            + ", ".join(missing)
        )

    normalized_email = str(TypeAdapter(EmailStr).validate_python(email)).lower()
    validated_password = validate_password_strength(password)
    normalized_name = name.strip()
    if not normalized_name:
        raise ValueError("SUPER_ADMIN_NAME must not be blank")
    if len(normalized_name) > 100:
        raise ValueError("SUPER_ADMIN_NAME must not exceed 100 characters")
    return normalized_email, validated_password, normalized_name


def bootstrap_super_admin(
    db: Session,
    *,
    email: str | None,
    password: str | None,
    name: str | None,
) -> BootstrapResult:
    """Create or securely synchronize the sole environment-owned Super Admin."""
    normalized_email, validated_password, normalized_name = _validated_credentials(
        email=email, password=password, name=name
    )

    try:
        super_admins = (
            db.query(User)
            .filter(User.role == UserRole.super_admin.value)
            .order_by(User.id)
            .all()
        )
        if len(super_admins) > 1:
            raise RuntimeError(
                "Multiple Super Admin accounts exist; refusing automatic reconciliation"
            )

        configured_user = (
            db.query(User)
            .filter(func.lower(User.email) == normalized_email)
            .first()
        )
        if configured_user and configured_user.role != UserRole.super_admin.value:
            raise RuntimeError(
                "SUPER_ADMIN_EMAIL belongs to a non-Super-Admin account"
            )
        if super_admins and configured_user is None:
            raise RuntimeError(
                "The existing Super Admin identity does not match SUPER_ADMIN_EMAIL"
            )

        if configured_user is None:
            configured_user = User(
                name=normalized_name,
                email=normalized_email,
                password_hash=get_password_hash(validated_password),
                role=UserRole.super_admin.value,
                is_active=True,
                is_email_verified=True,
                email_verified_at=datetime.now(timezone.utc),
            )
            db.add(configured_user)
            db.commit()
            db.refresh(configured_user)
            return BootstrapResult(
                user_id=configured_user.id,
                created=True,
                password_synchronized=False,
            )

        password_synchronized = not verify_password(
            validated_password, configured_user.password_hash
        )
        if password_synchronized:
            configured_user.password_hash = get_password_hash(validated_password)
        configured_user.name = normalized_name
        configured_user.email = normalized_email
        configured_user.is_active = True
        configured_user.is_email_verified = True
        if configured_user.email_verified_at is None:
            configured_user.email_verified_at = datetime.now(timezone.utc)
        configured_user.email_verification_token_hash = None
        configured_user.email_verification_expires_at = None
        db.commit()
        db.refresh(configured_user)
        return BootstrapResult(
            user_id=configured_user.id,
            created=False,
            password_synchronized=password_synchronized,
        )
    except Exception:
        db.rollback()
        raise


def bootstrap_super_admin_from_settings(db: Session) -> BootstrapResult:
    return bootstrap_super_admin(
        db,
        email=settings.SUPER_ADMIN_EMAIL,
        password=settings.SUPER_ADMIN_PASSWORD,
        name=settings.SUPER_ADMIN_NAME,
    )


def main() -> None:
    db = SessionLocal()
    try:
        result = bootstrap_super_admin_from_settings(db)
        action = "created" if result.created else "verified"
        synchronization = (
            "; configured password hash synchronized"
            if result.password_synchronized
            else ""
        )
        print(
            f"Super Admin {action} successfully (user_id={result.user_id})"
            f"{synchronization}."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
