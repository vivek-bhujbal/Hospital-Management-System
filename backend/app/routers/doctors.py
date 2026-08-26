from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import (
    Appointment, Doctor, User, PatientVital, LabOrder, LabOrderItem, LabResult,
    RadiologyOrder, RadiologyReport, RadiologyStudy,
)
from app.schemas.all_schemas import DoctorResponse, DoctorCreate, LabResultResponse, RadiologyReportResponse
from typing import List
from app.core.deps import require_permission
from app.core.permissions import Permission

router = APIRouter()
allow_doctor_view = require_permission(Permission.doctors_view)
allow_doctor_update_self = require_permission(Permission.doctors_update_self)
allow_doctor_clinical = require_permission(Permission.prescriptions_create) # Generally doctors have this


def _require_assigned_patient(db: Session, current_user: User, patient_id: int) -> Doctor:
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    assigned = db.query(Appointment.id).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.patient_id == patient_id,
    ).first()
    if not assigned:
        raise HTTPException(status_code=403, detail="Patient is not assigned to this doctor")
    return doctor

@router.get("/me", response_model=DoctorResponse)
def get_doctor_profile(db: Session = Depends(get_db), current_user: User = Depends(allow_doctor_update_self)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor

@router.put("/me", response_model=DoctorResponse)
def update_doctor_profile(profile_data: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_doctor_update_self)):
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
def get_all_doctors(db: Session = Depends(get_db), current_user = Depends(allow_doctor_view)):
    doctors = db.query(Doctor).filter(Doctor.status == 'active').all()
    return doctors

# Integration: Clinical Endpoints for Doctors
@router.get("/patients/{patient_id}/vitals")
def get_patient_vitals(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_doctor_clinical)):
    _require_assigned_patient(db, current_user, patient_id)
    vitals = db.query(PatientVital).filter(PatientVital.patient_id == patient_id).order_by(PatientVital.recorded_at.desc()).all()
    return vitals

@router.get("/patients/{patient_id}/lab-results", response_model=List[LabResultResponse])
def get_patient_lab_results(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_doctor_clinical)):
    _require_assigned_patient(db, current_user, patient_id)
    return db.query(LabResult).join(
        LabOrderItem, LabResult.order_item_id == LabOrderItem.id
    ).join(
        LabOrder, LabOrderItem.order_id == LabOrder.id
    ).filter(
        LabOrder.patient_id == patient_id,
        LabResult.status == "verified",
    ).order_by(LabResult.created_at.desc()).all()

@router.get("/patients/{patient_id}/radiology-reports", response_model=List[RadiologyReportResponse])
def get_patient_radiology_reports(patient_id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_doctor_clinical)):
    _require_assigned_patient(db, current_user, patient_id)
    return db.query(RadiologyReport).join(
        RadiologyStudy, RadiologyReport.study_id == RadiologyStudy.id
    ).join(
        RadiologyOrder, RadiologyStudy.order_id == RadiologyOrder.id
    ).filter(
        RadiologyOrder.patient_id == patient_id,
        RadiologyReport.status == "verified",
    ).order_by(RadiologyReport.created_at.desc()).all()
