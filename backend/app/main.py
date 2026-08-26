from fastapi import FastAPI, HTTPException
from sqlalchemy import text
from app.routers import auth, patients, doctors, receptionists, appointments, prescriptions, billing, admin, employees, rbac, super_admin, manager, nurse, pharmacy, lab, radiology, accountant, insurance, ambulance
from app.routers import realtime
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import engine

app = FastAPI(title="Hospital Management System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
app.include_router(receptionists.router, prefix="/receptionists", tags=["receptionists"])
app.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
app.include_router(prescriptions.router, prefix="/prescriptions", tags=["prescriptions"])
app.include_router(billing.router, prefix="/billing", tags=["billing"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(employees.router, prefix="/admin/employees", tags=["employees"])
app.include_router(rbac.router, prefix="/rbac", tags=["role-based access control"])
app.include_router(super_admin.router, tags=["super_admin"])
app.include_router(manager.router, tags=["manager"])
app.include_router(nurse.router, tags=["nurse"])
app.include_router(pharmacy.router, tags=["pharmacy"])
app.include_router(lab.router, tags=["laboratory"])
app.include_router(radiology.router, tags=["radiology"])
app.include_router(accountant.router, tags=["accountant"])
app.include_router(insurance.router, tags=["insurance"])
app.include_router(ambulance.router, tags=["ambulance"])
app.include_router(realtime.router, tags=["realtime"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Hospital Management API"}


@app.get("/health/live", tags=["health"])
def health_live():
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
def health_ready():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception:
        raise HTTPException(status_code=503, detail="Database is unavailable")
    return {"status": "ready"}
