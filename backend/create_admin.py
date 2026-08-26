import os

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.core.roles import UserRole
from app.database import SessionLocal
from app.models.all_models import User


def create_admin(
    db: Session,
    *,
    email: str,
    password: str,
    name: str,
    role: str = UserRole.admin.value,
) -> User:
    if role not in {UserRole.admin.value, UserRole.super_admin.value}:
        raise ValueError("Bootstrap role must be admin or super_admin")
    existing_admin = db.query(User).filter(User.email == email).first()
    if existing_admin:
        raise ValueError("A user with that email already exists")

    admin_user = User(
        name=name,
        email=email,
        password_hash=get_password_hash(password),
        role=role,
        is_active=True,
        is_email_verified=True,
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    return admin_user


def main() -> None:
    email = os.getenv("ADMIN_EMAIL")
    password = os.getenv("ADMIN_PASSWORD")
    name = os.getenv("ADMIN_NAME", "System Administrator")
    role = os.getenv("ADMIN_ROLE", UserRole.admin.value)
    if not email or not password:
        raise RuntimeError(
            "ADMIN_EMAIL and ADMIN_PASSWORD must be provided explicitly"
        )

    db = SessionLocal()
    try:
        admin = create_admin(
            db,
            email=email,
            password=password,
            name=name,
            role=role,
        )
        print(f"{role} user created successfully with ID: {admin.id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
