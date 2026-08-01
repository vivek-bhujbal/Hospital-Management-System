from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from app.models.all_models import User
import os

db_url = os.environ.get("DATABASE_URL")
if db_url:
    engine = create_engine(db_url)
    engine.connect()
else:
    # Try 3307 first (Docker), fallback to 3306 (local)
    try:
        engine = create_engine("mysql+pymysql://root:root@localhost:3307/hospital_management")
        engine.connect()
    except:
        engine = create_engine("mysql+pymysql://root:root@localhost:3306/hospital_management")
        engine.connect()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
import bcrypt

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_admin():
    db = SessionLocal()
    try:
        # Check if exists
        existing_admin = db.query(User).filter(User.email == 'admin@gmail.com').first()
        if existing_admin:
            print("Admin already exists.")
            return

        admin_user = User(
            name="System Admin",
            email="admin@gmail.com",
            password_hash=get_password_hash("admin123"),
            role="admin",
            is_active=True,
            is_email_verified=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        print("Admin user created successfully with ID:", admin_user.id)
    finally:
        db.close()

if __name__ == "__main__":
    create_admin()
