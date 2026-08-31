from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_permission, require_role
from app.core.permissions import Permission
from app.database import get_db
from app.models.all_models import Appointment, Billing, Doctor, Patient, Prescription, User
from app.schemas.all_schemas import PrescriptionCreate, PrescriptionResponse
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter()


@router.get("/me", response_model=list[PrescriptionResponse])
def get_my_prescriptions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.prescriptions_view_self)),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    return db.query(Prescription).join(Appointment).filter(
        Appointment.patient_id == patient.id,
    ).order_by(Prescription.created_at.desc()).all()


@router.post("/", response_model=PrescriptionResponse, status_code=201)
def create_prescription(
    payload: PrescriptionCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
):
    appointment = db.query(Appointment).filter(Appointment.id == payload.appointment_id).with_for_update().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
    if not doctor or appointment.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Appointment is not assigned to this doctor")
    existing = db.query(Prescription).filter_by(appointment_id=appointment.id).first()
    if existing:
        return existing
    if appointment.status != "in_progress":
        raise HTTPException(status_code=409, detail="Consultation can only complete an in-progress appointment")
    if doctor.consultation_fee is None:
        raise HTTPException(status_code=409, detail="Doctor consultation fee is not configured")

    prescription = Prescription(**payload.model_dump())
    bill = Billing(
        patient_id=appointment.patient_id,
        appointment_id=appointment.id,
        amount=doctor.consultation_fee,
        status="pending",
    )
    db.add_all([prescription, bill])
    appointment.status = "completed"
    try:
        db.flush()
        record_audit_event(
            db, actor=current_user, action="consultation.completed", resource_type="appointment",
            resource_id=str(appointment.id),
            new_values={"status": "completed", "prescription_id": prescription.id, "billing_id": bill.id},
            **request_audit_metadata(request),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(Prescription).filter_by(appointment_id=appointment.id).first()
        if existing:
            return existing
        raise HTTPException(status_code=409, detail="Consultation was completed by another request")
    db.refresh(prescription)
    return prescription
