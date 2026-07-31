import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\backend\app\routers"

patients_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Patient, User
from app.schemas.all_schemas import PatientResponse, PatientCreate
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_patient = RoleChecker(["patient"])

@router.get("/me", response_model=PatientResponse)
def get_patient_profile(db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient

@router.put("/me", response_model=PatientResponse)
def update_patient_profile(profile_data: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    patient.name = profile_data.name
    patient.age = profile_data.age
    patient.gender = profile_data.gender
    patient.contact = profile_data.contact
    patient.address = profile_data.address
    patient.blood_group = profile_data.blood_group
    
    db.commit()
    db.refresh(patient)
    return patient
"""

doctors_router = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Doctor
from app.schemas.all_schemas import DoctorResponse
from typing import List
from app.core.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=List[DoctorResponse])
def get_all_doctors(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    doctors = db.query(Doctor).filter(Doctor.status == 'active').all()
    return doctors
"""

appointments_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Appointment, Patient, User
from app.schemas.all_schemas import AppointmentResponse, AppointmentCreate
from typing import List
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_patient = RoleChecker(["patient"])

@router.post("/", response_model=AppointmentResponse)
def book_appointment(appt_in: AppointmentCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    # Validate patient
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient or patient.id != appt_in.patient_id:
        raise HTTPException(status_code=403, detail="Not authorized to book for this patient")

    new_appt = Appointment(
        patient_id=appt_in.patient_id,
        doctor_id=appt_in.doctor_id,
        appt_date=appt_in.appt_date,
        appt_time=appt_in.appt_time,
        reason=appt_in.reason,
        status='requested'
    )
    db.add(new_appt)
    db.commit()
    db.refresh(new_appt)
    return new_appt

@router.get("/me", response_model=List[AppointmentResponse])
def get_my_appointments(db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    appts = db.query(Appointment).filter(Appointment.patient_id == patient.id).order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc()).all()
    return appts
"""

prescriptions_router = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Prescription, Appointment, Patient, User
from app.schemas.all_schemas import PrescriptionResponse
from typing import List
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_patient = RoleChecker(["patient"])

@router.get("/me", response_model=List[PrescriptionResponse])
def get_my_prescriptions(db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    
    prescriptions = db.query(Prescription).join(Appointment).filter(Appointment.patient_id == patient.id).order_by(Prescription.created_at.desc()).all()
    return prescriptions
"""

billing_router = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Billing, Patient, User
from app.schemas.all_schemas import BillingResponse
from typing import List
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_patient = RoleChecker(["patient"])

@router.get("/me", response_model=List[BillingResponse])
def get_my_bills(db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    
    bills = db.query(Billing).filter(Billing.patient_id == patient.id).order_by(Billing.created_at.desc()).all()
    return bills
"""

files = {
    "patients.py": patients_router,
    "doctors.py": doctors_router,
    "appointments.py": appointments_router,
    "prescriptions.py": prescriptions_router,
    "billing.py": billing_router
}

for f, content in files.items():
    with open(os.path.join(base_dir, f), "w") as fp:
        fp.write(content)

print("Backend routers updated successfully.")
