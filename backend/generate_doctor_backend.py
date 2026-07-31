import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\backend\app\routers"

patients_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Patient, User, Appointment, Prescription
from app.schemas.all_schemas import PatientResponse, PatientCreate
from app.core.deps import get_current_user, RoleChecker
from typing import List

router = APIRouter()
allow_patient = RoleChecker(["patient"])
allow_staff = RoleChecker(["receptionist", "doctor", "admin"])
allow_receptionist = RoleChecker(["receptionist", "admin"])
allow_doc_admin = RoleChecker(["doctor", "admin"])

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

@router.get("/{id}/history")
def get_patient_history(id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_doc_admin)):
    appts = db.query(Appointment).filter(Appointment.patient_id == id).order_by(Appointment.appt_date.desc()).all()
    appt_ids = [a.id for a in appts]
    pres = db.query(Prescription).filter(Prescription.appointment_id.in_(appt_ids)).order_by(Prescription.created_at.desc()).all() if appt_ids else []
    
    return {
        "appointments": appts,
        "prescriptions": pres
    }

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
from app.models.all_models import Appointment, Patient, User, Doctor
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
def get_appointments(date: Optional[date] = None, doctor_id: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(allow_staff)):
    query = db.query(Appointment)
    if date:
        query = query.filter(Appointment.appt_date == date)
        
    if doctor_id:
        if doctor_id.lower() == "me" and current_user.role == "doctor":
            doc = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
            if doc:
                query = query.filter(Appointment.doctor_id == doc.id)
        else:
            query = query.filter(Appointment.doctor_id == int(doctor_id))
            
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

prescriptions_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Prescription, Appointment, Patient, User, Doctor, Billing
from app.schemas.all_schemas import PrescriptionResponse, PrescriptionCreate
from typing import List
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_patient = RoleChecker(["patient"])
allow_doctor = RoleChecker(["doctor"])

@router.get("/me", response_model=List[PrescriptionResponse])
def get_my_prescriptions(db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    
    return db.query(Prescription).join(Appointment).filter(Appointment.patient_id == patient.id).order_by(Prescription.created_at.desc()).all()

@router.post("/", response_model=PrescriptionResponse)
def create_prescription(pres_in: PrescriptionCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_doctor)):
    appt = db.query(Appointment).filter(Appointment.id == pres_in.appointment_id).first()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
        
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor or appt.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        new_pres = Prescription(
            appointment_id=appt.id,
            diagnosis=pres_in.diagnosis,
            medicine=pres_in.medicine,
            dosage=pres_in.dosage,
            notes=pres_in.notes
        )
        db.add(new_pres)
        
        appt.status = 'completed'
        
        new_bill = Billing(
            patient_id=appt.patient_id,
            appointment_id=appt.id,
            amount=500.00,
            status='pending'
        )
        db.add(new_bill)
        
        db.commit()
        db.refresh(new_pres)
        return new_pres
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Transaction failed")
"""

doctors_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Doctor, User
from app.schemas.all_schemas import DoctorResponse, DoctorCreate
from typing import List
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_doctor = RoleChecker(["doctor"])

@router.get("/me", response_model=DoctorResponse)
def get_doctor_profile(db: Session = Depends(get_db), current_user: User = Depends(allow_doctor)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor

@router.put("/me", response_model=DoctorResponse)
def update_doctor_profile(profile_data: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_doctor)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    
    doctor.name = profile_data.name
    doctor.specialization = profile_data.specialization
    doctor.timing_start = profile_data.timing_start
    doctor.timing_end = profile_data.timing_end
    doctor.contact = profile_data.contact
    
    db.commit()
    db.refresh(doctor)
    return doctor

@router.get("/", response_model=List[DoctorResponse])
def get_all_doctors(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    doctors = db.query(Doctor).filter(Doctor.status == 'active').all()
    return doctors
"""

files = {
    "patients.py": patients_router,
    "appointments.py": appointments_router,
    "prescriptions.py": prescriptions_router,
    "doctors.py": doctors_router
}

for f, content in files.items():
    with open(os.path.join(base_dir, f), "w") as fp:
        fp.write(content)

print("Backend doctor routers updated successfully.")
