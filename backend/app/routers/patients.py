from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import (
    Patient, User, Appointment, Prescription, PatientVital, Doctor,
    LabOrder, LabResult, RadiologyOrder, RadiologyReport,
    Dispensing, Billing, InsuranceClaim
)
from app.schemas.all_schemas import PatientResponse, PatientCreate
from app.core.deps import require_permission
from app.core.permissions import Permission
from typing import List

router = APIRouter()
allow_patient_view = require_permission(Permission.patients_view_self)
allow_patient_update = require_permission(Permission.patients_update_self)
allow_staff = require_permission(Permission.patients_view)
allow_register = require_permission(Permission.patients_create)
allow_medical_history = require_permission(Permission.patients_view_medical_history)

@router.get("/me", response_model=PatientResponse)
def get_patient_profile(db: Session = Depends(get_db), current_user: User = Depends(allow_patient_view)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    return patient

@router.put("/me", response_model=PatientResponse)
def update_patient_profile(profile_data: PatientCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_patient_update)):
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

@router.get("/me/portal")
def get_patient_portal_data(db: Session = Depends(get_db), current_user: User = Depends(allow_patient_view)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    id = patient.id

    appts = db.query(Appointment).filter(Appointment.patient_id == id).order_by(Appointment.appt_date.desc()).all()
    vitals = db.query(PatientVital).filter(PatientVital.patient_id == id).order_by(PatientVital.recorded_at.desc()).all()

    # Prescriptions and dispensing
    appt_ids = [a.id for a in appts]
    prescriptions = db.query(Prescription).filter(Prescription.appointment_id.in_(appt_ids)).order_by(Prescription.created_at.desc()).all() if appt_ids else []
    pres_ids = [p.id for p in prescriptions]
    dispensing = db.query(Dispensing).filter(Dispensing.prescription_id.in_(pres_ids)).all() if pres_ids else []

    # Lab and Radiology
    lab_orders = db.query(LabOrder).filter(LabOrder.patient_id == id).all()
    radiology_orders = db.query(RadiologyOrder).filter(RadiologyOrder.patient_id == id).all()

    # Billing and Insurance
    bills = db.query(Billing).filter(Billing.patient_id == id).order_by(Billing.created_at.desc()).all()

    return {
        "appointments": appts,
        "vitals": vitals,
        "prescriptions": prescriptions,
        "dispensing_history": dispensing,
        "lab_orders": lab_orders,
        "radiology_orders": radiology_orders,
        "bills": bills
    }

@router.get("/{id}/history")
def get_patient_history(id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_medical_history)):
    patient = db.get(Patient, id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    if current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        assigned = db.query(Appointment.id).filter(
            Appointment.patient_id == id,
            Appointment.doctor_id == doctor.id,
        ).first()
        if not assigned:
            raise HTTPException(status_code=403, detail="Patient is not assigned to this doctor")

    appts = db.query(Appointment).filter(Appointment.patient_id == id).order_by(Appointment.appt_date.desc()).all()
    appt_ids = [a.id for a in appts]
    pres = db.query(Prescription).filter(Prescription.appointment_id.in_(appt_ids)).order_by(Prescription.created_at.desc()).all() if appt_ids else []
    
    return {
        "patient": patient,
        "appointments": appts,
        "prescriptions": pres
    }

@router.get("/", response_model=List[PatientResponse])
def get_all_patients(db: Session = Depends(get_db), current_user: User = Depends(allow_staff)):
    if current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        return db.query(Patient).join(
            Appointment, Appointment.patient_id == Patient.id,
        ).filter(
            Appointment.doctor_id == doctor.id,
        ).distinct().order_by(Patient.name.asc()).all()
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
