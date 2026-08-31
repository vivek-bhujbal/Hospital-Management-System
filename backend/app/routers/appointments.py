from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.all_models import Appointment, Patient, User, Doctor
from app.schemas.all_schemas import AppointmentResponse, AppointmentCreate
from typing import List, Optional
from datetime import date, datetime, timezone
from app.core.deps import get_current_user, require_permission, require_role
from app.core.permissions import Permission
from app.services.audit_service import record_audit_event, request_audit_metadata
from app.services.authorization import user_has_permission

router = APIRouter()
allow_patient = require_permission(Permission.appointments_view_self)
allow_booking = require_permission(Permission.appointments_create)
allow_staff = require_permission(Permission.appointments_view)
allow_confirm = require_permission(Permission.appointments_update)
allow_checkin = require_permission(Permission.appointments_checkin)

@router.post("/", response_model=AppointmentResponse, status_code=201)
def book_appointment(
    appt_in: AppointmentCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(allow_booking),
):
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or patient.id != appt_in.patient_id:
            raise HTTPException(status_code=403, detail="Not authorized to book for this patient")
            
    patient = db.get(Patient, appt_in.patient_id)
    doctor = db.query(Doctor).filter(Doctor.id == appt_in.doctor_id).with_for_update().first()
    if not patient:
        raise HTTPException(status_code=400, detail="Patient does not exist")
    if not doctor or doctor.status != "active":
        raise HTTPException(status_code=400, detail="Doctor is unavailable")
    if appt_in.appt_date < date.today():
        raise HTTPException(status_code=400, detail="Appointment date cannot be in the past")
    if (
        appt_in.appt_date == date.today()
        and appt_in.appt_time <= datetime.now().time().replace(microsecond=0)
    ):
        raise HTTPException(status_code=400, detail="Appointment time cannot be in the past")
    if doctor.timing_start and appt_in.appt_time < doctor.timing_start:
        raise HTTPException(status_code=400, detail="Appointment is before the doctor's working hours")
    if doctor.timing_end and appt_in.appt_time >= doctor.timing_end:
        raise HTTPException(status_code=400, detail="Appointment is outside the doctor's working hours")
    collision = db.query(Appointment.id).filter(
        Appointment.doctor_id == doctor.id,
        Appointment.appt_date == appt_in.appt_date,
        Appointment.appt_time == appt_in.appt_time,
        Appointment.status != "cancelled",
    ).first()
    if collision:
        raise HTTPException(status_code=409, detail="Doctor already has an appointment in this time slot")
    patient_collision = db.query(Appointment.id).filter(
        Appointment.patient_id == patient.id,
        Appointment.appt_date == appt_in.appt_date,
        Appointment.appt_time == appt_in.appt_time,
        Appointment.status != "cancelled",
    ).first()
    if patient_collision:
        raise HTTPException(status_code=409, detail="Patient already has an appointment in this time slot")
    new_appt = Appointment(
        patient_id=appt_in.patient_id,
        doctor_id=appt_in.doctor_id,
        appt_date=appt_in.appt_date,
        appt_time=appt_in.appt_time,
        reason=appt_in.reason,
        status='requested'
    )
    db.add(new_appt)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="appointment.created", resource_type="appointment",
        resource_id=str(new_appt.id),
        new_values={"patient_id": new_appt.patient_id, "doctor_id": new_appt.doctor_id, "status": new_appt.status},
        **request_audit_metadata(request),
    )
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

    if current_user.role == "doctor":
        doctor = db.query(Doctor).filter(Doctor.user_id == current_user.id).first()
        if not doctor:
            raise HTTPException(status_code=404, detail="Doctor profile not found")
        if doctor_id and doctor_id.lower() != "me":
            try:
                requested_doctor_id = int(doctor_id)
            except ValueError:
                raise HTTPException(status_code=422, detail="doctor_id must be an integer or 'me'")
            if requested_doctor_id != doctor.id:
                raise HTTPException(status_code=403, detail="Cannot view another doctor's appointments")
        query = query.filter(Appointment.doctor_id == doctor.id)
    elif doctor_id:
        if doctor_id.lower() == "me":
            raise HTTPException(status_code=422, detail="doctor_id='me' is only valid for doctors")
        try:
            query = query.filter(Appointment.doctor_id == int(doctor_id))
        except ValueError:
            raise HTTPException(status_code=422, detail="doctor_id must be an integer or 'me'")
            
    return query.order_by(Appointment.appt_date.asc(), Appointment.appt_time.asc()).all()

@router.patch("/{id}/confirm")
def confirm_appointment(id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(allow_confirm)):
    appt = db.query(Appointment).filter(Appointment.id == id).with_for_update().first()
    if not appt: raise HTTPException(status_code=404)
    if appt.status == "confirmed":
        return {"status": "success"}
    if appt.status != "requested":
        raise HTTPException(status_code=409, detail=f"Cannot confirm an appointment in {appt.status} state")
    appt.status = 'confirmed'
    record_audit_event(
        db, actor=current_user, action="appointment.confirmed", resource_type="appointment",
        resource_id=str(appt.id), old_values={"status": "requested"},
        new_values={"status": "confirmed"}, **request_audit_metadata(request),
    )
    db.commit()
    return {"status": "success"}

@router.patch("/{id}/checkin")
def checkin_appointment(id: int, request: Request, db: Session = Depends(get_db), current_user: User = Depends(allow_checkin)):
    appt = db.query(Appointment).filter(Appointment.id == id).with_for_update().first()
    if not appt: raise HTTPException(status_code=404)
    if appt.status == "checked_in":
        return {"status": "success"}
    if appt.status != "confirmed":
        raise HTTPException(status_code=409, detail=f"Cannot check in an appointment in {appt.status} state")
    if appt.appt_date != date.today():
        raise HTTPException(status_code=409, detail="Only today's appointments can be checked in")
    appt.status = 'checked_in'
    appt.checked_in_at = func.now()
    record_audit_event(
        db, actor=current_user, action="appointment.checked_in", resource_type="appointment",
        resource_id=str(appt.id), old_values={"status": "confirmed"},
        new_values={"status": "checked_in"}, **request_audit_metadata(request),
    )
    db.commit()
    return {"status": "success"}


@router.patch("/{id}/cancel")
def cancel_appointment(
    id: int, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    appointment = db.query(Appointment).filter(Appointment.id == id).with_for_update().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    owns_appointment = False
    if current_user.role == "patient":
        patient = db.query(Patient).filter_by(user_id=current_user.id).first()
        owns_appointment = bool(patient and patient.id == appointment.patient_id)
    if not owns_appointment and not user_has_permission(current_user, Permission.appointments_cancel, db):
        raise HTTPException(status_code=403, detail="Not authorized to cancel this appointment")
    if appointment.status == "cancelled":
        return {"status": "success"}
    if appointment.status not in ("requested", "confirmed"):
        raise HTTPException(status_code=409, detail=f"Cannot cancel an appointment in {appointment.status} state")
    old_status = appointment.status
    appointment.status = "cancelled"
    record_audit_event(
        db, actor=current_user, action="appointment.cancelled", resource_type="appointment",
        resource_id=str(appointment.id), old_values={"status": old_status},
        new_values={"status": "cancelled"}, **request_audit_metadata(request),
    )
    db.commit()
    return {"status": "success"}


@router.patch("/{id}/start")
def start_consultation(
    id: int, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_role("doctor")),
):
    appointment = db.query(Appointment).filter(Appointment.id == id).with_for_update().first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    doctor = db.query(Doctor).filter_by(user_id=current_user.id).first()
    if not doctor or appointment.doctor_id != doctor.id:
        raise HTTPException(status_code=403, detail="Appointment is not assigned to this doctor")
    if appointment.status == "in_progress":
        return {"status": "success"}
    if appointment.status != "checked_in":
        raise HTTPException(status_code=409, detail=f"Cannot start consultation from {appointment.status} state")
    appointment.status = "in_progress"
    record_audit_event(
        db, actor=current_user, action="consultation.started", resource_type="appointment",
        resource_id=str(appointment.id), old_values={"status": "checked_in"},
        new_values={"status": "in_progress"}, **request_audit_metadata(request),
    )
    db.commit()
    return {"status": "success"}
