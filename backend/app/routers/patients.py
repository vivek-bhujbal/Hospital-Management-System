from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import Patient, User, Appointment, Prescription
from app.schemas.all_schemas import PatientResponse, PatientCreate
from app.core.deps import get_current_user, RoleChecker, PermissionChecker
from typing import List

router = APIRouter()
allow_patient = RoleChecker(["patient"])
allow_staff = RoleChecker(["receptionist", "doctor", "admin"])
allow_register = PermissionChecker("can_register_patient")
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
def register_patient_by_receptionist(patient_in: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_register)):
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
