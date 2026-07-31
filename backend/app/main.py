from fastapi import FastAPI
from app.routers import auth, patients, doctors, receptionists, appointments, prescriptions, billing, admin, employees

app = FastAPI(title="Hospital Management System API")

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(patients.router, prefix="/patients", tags=["patients"])
app.include_router(doctors.router, prefix="/doctors", tags=["doctors"])
app.include_router(receptionists.router, prefix="/receptionists", tags=["receptionists"])
app.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
app.include_router(prescriptions.router, prefix="/prescriptions", tags=["prescriptions"])
app.include_router(billing.router, prefix="/billing", tags=["billing"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(employees.router, prefix="/admin/employees", tags=["employees"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Hospital Management API"}
