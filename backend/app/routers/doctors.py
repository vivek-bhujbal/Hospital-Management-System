from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.all_models import (
    Appointment, Doctor, User, PatientVital, LabOrder, LabOrderItem, LabResult,
    RadiologyOrder, RadiologyReport, RadiologyStudy, NursingTask, Patient,
)
from app.schemas.all_schemas import (
    DoctorResponse, DoctorSelfUpdate, LabResultResponse, NursingTaskCreate,
    NursingTaskResponse, RadiologyReportResponse,
)
from typing import List
from app.core.deps import require_permission, require_role
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.services.audit_service import record_audit_event, request_audit_metadata

router = APIRouter()
allow_doctor_view = require_permission(Permission.doctors_view)
allow_doctor_self = require_role("doctor")
allow_doctor_clinical = require_role("doctor")


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
def get_doctor_profile(db: Session = Depends(get_db), current_user: User = Depends(allow_doctor_self)):
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")
    return doctor

@router.put("/me", response_model=DoctorResponse)
def update_doctor_profile(profile_data: DoctorSelfUpdate, db: Session = Depends(get_db), current_user: User = Depends(allow_doctor_self)):
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
        LabResult.status == "finalized",
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


@router.post("/nursing-tasks", response_model=NursingTaskResponse, status_code=201)
def assign_nursing_task(
    task: NursingTaskCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctor_clinical),
):
    _require_assigned_patient(db, current_user, task.patient_id)
    patient = db.get(Patient, task.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    nurse = db.query(User).filter(
        User.id == task.assigned_nurse_id,
        User.role == UserRole.nurse.value,
        User.is_active.is_(True),
    ).first()
    if not nurse:
        raise HTTPException(status_code=400, detail="Assigned nurse is invalid or inactive")
    item = NursingTask(**task.model_dump(exclude={"status"}), status="pending")
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="nursing_task.assigned",
        resource_type="nursing_task", resource_id=str(item.id),
        new_values=task.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item
