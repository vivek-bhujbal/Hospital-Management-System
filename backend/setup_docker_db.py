import pymysql
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import bcrypt
from app.models.all_models import Base, User

def setup():
    # 1. Connect and create DB
    try:
        conn = pymysql.connect(host='localhost', port=3307, user='root', password='root')
        with conn.cursor() as cursor:
            cursor.execute("CREATE DATABASE IF NOT EXISTS hospital_management;")
        conn.commit()
        conn.close()
        print("Database 'hospital_management' verified on port 3307.")
    except Exception as e:
        print("Failed to create database:", e)
        return

    # 2. Create tables
    engine = create_engine("mysql+pymysql://root:root@localhost:3307/hospital_management")
    Base.metadata.create_all(bind=engine)
    print("All tables created successfully on port 3307.")

    # 3. Create Admin User
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        existing_admin = db.query(User).filter(User.email == 'admin@gmail.com').first()
        if existing_admin:
            print("Admin already exists.")
        else:
            salt = bcrypt.gensalt()
            hashed_pw = bcrypt.hashpw("admin123".encode('utf-8'), salt).decode('utf-8')
            admin_user = User(
                name="System Admin",
                email="admin@gmail.com",
                password_hash=hashed_pw,
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("Admin user created successfully with ID:", admin_user.id)
    finally:
        db.close()

if __name__ == "__main__":
    setup()
