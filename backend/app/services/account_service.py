from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.identity import EMAIL_ALREADY_REGISTERED, normalize_email
from app.models.all_models import User


def find_user_by_email(
    db: Session,
    email: object,
    *,
    exclude_user_id: int | None = None,
) -> User | None:
    normalized_email = normalize_email(email)
    query = db.query(User).filter(
        func.lower(func.trim(User.email)) == normalized_email
    )
    if exclude_user_id is not None:
        query = query.filter(User.id != exclude_user_id)
    return query.first()


def ensure_email_available(
    db: Session,
    email: object,
    *,
    exclude_user_id: int | None = None,
) -> str:
    normalized_email = normalize_email(email)
    if find_user_by_email(db, normalized_email, exclude_user_id=exclude_user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=EMAIL_ALREADY_REGISTERED,
        )
    return normalized_email


def add_user_account(db: Session, user: User) -> User:
    """Normalize, pre-check, and flush a new account in the caller's transaction."""
    normalized_email = ensure_email_available(db, user.email)
    user.email = normalized_email
    db.add(user)
    try:
        db.flush()
    except IntegrityError as exc:
        _raise_email_conflict_after_rollback(db, normalized_email, exc)
    return user


def update_user_email(db: Session, user: User, email: object) -> str:
    """Allow an account to keep its own email but reject every other owner."""
    normalized_email = normalize_email(email)
    if normalized_email == normalize_email(user.email):
        user.email = normalized_email
        return normalized_email

    user.email = ensure_email_available(
        db,
        normalized_email,
        exclude_user_id=user.id,
    )
    try:
        db.flush()
    except IntegrityError as exc:
        _raise_email_conflict_after_rollback(db, normalized_email, exc)
    return normalized_email


def _raise_email_conflict_after_rollback(
    db: Session,
    email: object,
    error: IntegrityError,
) -> None:
    """Translate a database race into the same safe API conflict response."""
    normalized_email = normalize_email(email)
    db.rollback()
    if find_user_by_email(db, normalized_email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=EMAIL_ALREADY_REGISTERED,
        ) from error
    raise error
