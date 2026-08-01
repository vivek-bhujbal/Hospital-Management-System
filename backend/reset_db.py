import pymysql
from app.database import Base, engine
from app.models.all_models import *

def reset_db():
    try:
        # Drop all tables
        print("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        print("All tables dropped.")

        # Create all tables
        print("Creating all tables...")
        Base.metadata.create_all(bind=engine)
        print("All tables created successfully!")
    except Exception as e:
        print(f"Error during database reset: {e}")

if __name__ == "__main__":
    reset_db()
