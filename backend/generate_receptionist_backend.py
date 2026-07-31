import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\backend\app\routers"

patients_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Patient, User
from app.schemas.all_schemas import PatientResponse, PatientCreate
from app.core.deps import get_current_user, RoleChecker
from typing import List

router = APIRouter()
allow_patient = RoleChecker(["patient"])
allow_staff = RoleChecker(["receptionist", "doctor", "admin"])
allow_receptionist = RoleChecker(["receptionist", "admin"])

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

@router.get("/", response_model=List[PatientResponse])
def get_all_patients(db: Session = Depends(get_db), current_user: User = Depends(allow_staff)):
    return db.query(Patient).all()

@router.post("/", response_model=PatientResponse)
def register_patient_by_receptionist(patient_in: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_receptionist)):
    new_patient = Patient(
        name=patient_in.name,
        age=patient_in.age,
        gender=patient_in.gender,
        contact=patient_in.contact,
        address=patient_in.address,
        blood_group=patient_in.blood_group
    )
    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)
    return new_patient
"""

appointments_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.all_models import Appointment, Patient, User
from app.schemas.all_schemas import AppointmentResponse, AppointmentCreate
from typing import List, Optional
from datetime import date
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_patient = RoleChecker(["patient"])
allow_booking = RoleChecker(["patient", "receptionist", "admin"])
allow_receptionist = RoleChecker(["receptionist"])
allow_staff = RoleChecker(["receptionist", "doctor", "admin"])

@router.post("/", response_model=AppointmentResponse)
def book_appointment(appt_in: AppointmentCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_booking)):
    if current_user.role == "patient":
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
    return db.query(Appointment).filter(Appointment.patient_id == patient.id).order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc()).all()

@router.get("/", response_model=List[AppointmentResponse])
def get_appointments(date: Optional[date] = None, db: Session = Depends(get_db), current_user: User = Depends(allow_staff)):
    query = db.query(Appointment)
    if date:
        query = query.filter(Appointment.appt_date == date)
    return query.order_by(Appointment.appt_date.asc(), Appointment.appt_time.asc()).all()

@router.patch("/{id}/confirm")
def confirm_appointment(id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_receptionist)):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt: raise HTTPException(status_code=404)
    appt.status = 'confirmed'
    db.commit()
    return {"status": "success"}

@router.patch("/{id}/checkin")
def checkin_appointment(id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_receptionist)):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt: raise HTTPException(status_code=404)
    appt.status = 'checked_in'
    appt.checked_in_at = func.now()
    db.commit()
    return {"status": "success"}
"""

billing_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.all_models import Billing, Patient, User, Receptionist
from app.schemas.all_schemas import BillingResponse
from typing import List
from app.core.deps import get_current_user, RoleChecker
import uuid

router = APIRouter()
allow_patient = RoleChecker(["patient"])
allow_receptionist = RoleChecker(["receptionist", "admin"])

@router.get("/me", response_model=List[BillingResponse])
def get_my_bills(db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    return db.query(Billing).filter(Billing.patient_id == patient.id).order_by(Billing.created_at.desc()).all()

@router.get("/", response_model=List[BillingResponse])
def get_all_billing(db: Session = Depends(get_db), current_user: User = Depends(allow_receptionist)):
    return db.query(Billing).order_by(Billing.created_at.desc()).all()

@router.post("/{id}/collect", response_model=BillingResponse)
def collect_payment(id: int, payment_method: str, db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["receptionist"]))):
    bill = db.query(Billing).filter(Billing.id == id).first()
    if not bill: raise HTTPException(status_code=404)
    
    receptionist = db.query(Receptionist).filter(Receptionist.user_id == current_user.id).first()
    
    bill.status = 'paid'
    bill.payment_method = payment_method
    bill.collected_by = receptionist.id if receptionist else None
    bill.receipt_no = "REC-" + str(uuid.uuid4()).split("-")[0].upper()
    bill.paid_at = func.now()
    db.commit()
    db.refresh(bill)
    return bill
"""

admin_router = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import HospitalSetting
from app.schemas.all_schemas import HospitalSettingResponse
from app.core.deps import get_current_user

router = APIRouter()

@router.get("/settings", response_model=HospitalSettingResponse)
def get_settings(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    setting = db.query(HospitalSetting).first()
    if not setting:
        setting = HospitalSetting(hospital_name="Demo Hospital", address="123 Health St", phone="555-0100", gstin="GSTIN123456")
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting
"""

files = {
    "patients.py": patients_router,
    "appointments.py": appointments_router,
    "billing.py": billing_router,
    "admin.py": admin_router
}

for f, content in files.items():
    with open(os.path.join(base_dir, f), "w") as fp:
        fp.write(content)

print("Backend receptionist routers updated successfully.")
