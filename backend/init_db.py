import pymysql
from app.database import Base, engine
# Import all models so they register with Base.metadata
from app.models.all_models import *

def init_db():
    try:
        # 1. Connect to MySQL server to create the DB if it doesn't exist
        connection = pymysql.connect(host='localhost', user='root', password='root', port=3306)
        with connection.cursor() as cursor:
            cursor.execute("CREATE DATABASE IF NOT EXISTS hospital_management;")
        connection.commit()
        connection.close()
        print("Database 'hospital_management' verified/created.")

        # 2. Create tables using SQLAlchemy metadata
        Base.metadata.create_all(bind=engine)
        print("SQLAlchemy migration completed: All tables created successfully!")
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    init_db()
