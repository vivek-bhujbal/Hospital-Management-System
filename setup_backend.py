import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\backend"
dirs = [
    "app",
    "app/models",
    "app/schemas",
    "app/routers",
    "app/core"
]

for d in dirs:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

files = {
    "requirements.txt": "fastapi\nuvicorn\nsqlalchemy\npymysql\npasslib[bcrypt]\npython-jose[cryptography]\npython-multipart\npydantic\npydantic-settings\n",
    "app/__init__.py": "",
    "app/main.py": """from fastapi import FastAPI
from app.routers import auth, patients, doctors, receptionists, appointments, prescriptions, billing, admin

app = FastAPI(title="Hospital Management System API")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
app.include_router(receptionists.router, prefix="/receptionists", tags=["receptionists"])
app.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
app.include_router(prescriptions.router, prefix="/prescriptions", tags=["prescriptions"])
app.include_router(billing.router, prefix="/billing", tags=["billing"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Hospital Management API"}
""",
    "app/database.py": """from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",
    "app/core/__init__.py": "",
    "app/core/config.py": """from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://root:password@localhost/hospital_management"
    SECRET_KEY: str = "supersecretkey"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
""",
    "app/core/security.py": """from passlib.context import CryptContext
from datetime import datetime, timedelta
from jose import jwt
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
""",
    "app/models/__init__.py": "from .all_models import *\n",
    "app/models/all_models.py": """from sqlalchemy import Column, Integer, String, Enum, Text, Time, Date, DECIMAL, ForeignKey, TIMESTAMP, func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum('patient','doctor','receptionist','admin'), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Patient(Base):
    __tablename__ = 'patients'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer)
    gender = Column(Enum('male','female','other'))
    contact = Column(String(20))
    address = Column(Text)
    blood_group = Column(String(5))

class Doctor(Base):
    __tablename__ = 'doctors'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    name = Column(String(100), nullable=False)
    specialization = Column(String(100))
    timing_start = Column(Time)
    timing_end = Column(Time)
    contact = Column(String(20))
    status = Column(Enum('active','on_leave'), default='active')

class Receptionist(Base):
    __tablename__ = 'receptionists'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)
    name = Column(String(100), nullable=False)
    contact = Column(String(20))

class Appointment(Base):
    __tablename__ = 'appointments'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=False)
    appt_date = Column(Date, nullable=False)
    appt_time = Column(Time, nullable=False)
    reason = Column(String(255))
    status = Column(Enum('requested','confirmed','checked_in','in_progress','completed','cancelled'), default='requested')
    checked_in_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Prescription(Base):
    __tablename__ = 'prescriptions'
    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    diagnosis = Column(Text)
    medicine = Column(String(150))
    dosage = Column(String(100))
    notes = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())

class Billing(Base):
    __tablename__ = 'billing'
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    appointment_id = Column(Integer, ForeignKey('appointments.id'), nullable=False)
    amount = Column(DECIMAL(10,2), nullable=False)
    status = Column(Enum('pending','paid'), default='pending')
    payment_method = Column(Enum('cash','card','upi'))
    collected_by = Column(Integer, ForeignKey('receptionists.id'))
    receipt_no = Column(String(30))
    paid_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

class HospitalSetting(Base):
    __tablename__ = 'hospital_settings'
    id = Column(Integer, primary_key=True, index=True)
    hospital_name = Column(String(150))
    address = Column(Text)
    phone = Column(String(20))
    gstin = Column(String(20))
""",
    "app/schemas/__init__.py": "",
    "app/routers/__init__.py": "",
}

# The routers
routers_list = ["auth", "patients", "doctors", "receptionists", "appointments", "prescriptions", "billing", "admin"]
for r in routers_list:
    files[f"app/routers/{r}.py"] = f"from fastapi import APIRouter\n\nrouter = APIRouter()\n\n@router.get('/')\ndef read_{r}():\n    return {{'message': '{r.capitalize()} endpoint'}}\n"

for fpath, content in files.items():
    full_path = os.path.join(base_dir, fpath)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

print(f"Successfully generated {len(files)} files in backend structure.")
