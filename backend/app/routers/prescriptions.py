from fastapi import APIRouter, Depends, HTTPException
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
