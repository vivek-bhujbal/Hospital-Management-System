from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.all_models import Appointment, Patient, User, Doctor, Employee, EmployeePermission
from app.schemas.all_schemas import AppointmentResponse, AppointmentCreate
from typing import List, Optional
from datetime import date
from app.core.deps import get_current_user, RoleChecker, PermissionChecker

router = APIRouter()
allow_patient = RoleChecker(["patient"])
allow_booking = RoleChecker(["patient", "receptionist", "admin"])
allow_staff = RoleChecker(["receptionist", "doctor", "admin"])
allow_confirm = PermissionChecker("can_schedule_appointment")
allow_checkin = PermissionChecker("can_checkin_patient")

@router.post("/", response_model=AppointmentResponse)
def book_appointment(appt_in: AppointmentCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_booking)):
    if current_user.role == "patient":
        patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
        if not patient or patient.id != appt_in.patient_id:
            raise HTTPException(status_code=403, detail="Not authorized to book for this patient")
            
    if current_user.role == "receptionist":
        emp = db.query(Employee).filter(Employee.user_id == current_user.id).first()
        perms = db.query(EmployeePermission).filter(EmployeePermission.employee_id == emp.id).first() if emp else None
        if not perms or perms.can_schedule_appointment == 0:
            raise HTTPException(status_code=403, detail="You do not have permission to schedule appointments")

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
def confirm_appointment(id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_confirm)):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt: raise HTTPException(status_code=404)
    appt.status = 'confirmed'
    db.commit()
    return {"status": "success"}

@router.patch("/{id}/checkin")
def checkin_appointment(id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_checkin)):
    appt = db.query(Appointment).filter(Appointment.id == id).first()
    if not appt: raise HTTPException(status_code=404)
    appt.status = 'checked_in'
    appt.checked_in_at = func.now()
    db.commit()
    return {"status": "success"}
