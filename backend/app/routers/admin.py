from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.all_models import Doctor, Patient, Appointment, Billing, User, HospitalSetting
from app.schemas.all_schemas import DoctorResponse, DoctorCreate, PatientResponse, AppointmentResponse, HospitalSettingResponse, DoctorCreateWithAuth, DoctorPasswordReset
from typing import List
from datetime import date
from app.core.deps import require_permission, require_role
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.core.security import get_password_hash
from app.services.audit_service import record_audit_event, request_audit_metadata

router = APIRouter(dependencies=[Depends(require_role(UserRole.admin))])
allow_reports = require_permission(Permission.reports_view)
allow_doctors_view = require_permission(Permission.doctors_view)
allow_doctors_manage = require_permission(Permission.doctors_manage)
allow_patients_view = require_permission(Permission.patients_view)
allow_appointments_view = require_permission(Permission.appointments_view)
allow_billing_report = require_permission(Permission.billing_report)
allow_settings_view = require_permission(Permission.settings_view)

@router.get("/overview")
def get_overview(db: Session = Depends(get_db), current_user: User = Depends(allow_reports)):
    today = date.today()
    total_patients = db.query(Patient).count()
    total_doctors = db.query(Doctor).count()
    today_appts = db.query(Appointment).filter(Appointment.appt_date == today).count()
    pending_bills = db.query(Billing).filter(Billing.status == 'pending').count()
    collected_revenue = db.query(func.sum(Billing.amount)).filter(Billing.status == 'paid').scalar() or 0
    recent_appointments = (
        db.query(Appointment)
        .order_by(Appointment.created_at.desc(), Appointment.id.desc())
        .limit(5)
        .all()
    )
    recent_billing = (
        db.query(Billing)
        .order_by(Billing.created_at.desc(), Billing.id.desc())
        .limit(5)
        .all()
    )
    
    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "today_appointments": today_appts,
        "pending_bills": pending_bills,
        "collected_revenue": float(collected_revenue),
        "recent_appointments": recent_appointments,
        "recent_billing": recent_billing,
    }

@router.get("/doctors", response_model=List[DoctorResponse])
def admin_get_doctors(db: Session = Depends(get_db), current_user: User = Depends(allow_doctors_view)):
    doctors = db.query(Doctor).all()
    for doc in doctors:
        user = db.query(User).filter(User.id == doc.user_id).first()
        if user:
            doc.email = user.email
    return doctors

@router.post("/doctors", response_model=DoctorResponse)
def admin_create_doctor(
    doc_in: DoctorCreateWithAuth,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctors_manage),
):
    # Check if email exists
    if db.query(User).filter(User.email == doc_in.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    
    # 1. Create User
    new_user = User(
        name=doc_in.name,
        email=doc_in.email,
        password_hash=get_password_hash(doc_in.password),
        role='doctor',
        is_active=True,
        is_email_verified=True,
    )
    db.add(new_user)
    db.flush() # get user ID
    
    # 2. Create Doctor
    new_doc = Doctor(
        user_id=new_user.id,
        name=doc_in.name,
        specialization=doc_in.specialization,
        department_id=doc_in.department_id,
        consultation_fee=doc_in.consultation_fee,
        timing_start=doc_in.timing_start,
        timing_end=doc_in.timing_end,
        contact=doc_in.contact,
        status=doc_in.status
    )
    db.add(new_doc)
    db.flush()
    record_audit_event(
        db,
        actor=current_user,
        action="doctor.created",
        resource_type="doctor",
        resource_id=str(new_doc.id),
        new_values={
            "user_id": new_user.id,
            "email": new_user.email,
            "specialization": new_doc.specialization,
            "department_id": new_doc.department_id,
            "consultation_fee": new_doc.consultation_fee,
            "status": new_doc.status,
        },
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(new_doc)
    new_doc.email = new_user.email
    return new_doc

@router.patch("/doctors/{id}/reset-password")
def admin_reset_doctor_password(
    id: int,
    reset_in: DoctorPasswordReset,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctors_manage),
):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Doctor not found")
        
    user = db.query(User).filter(User.id == doc.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Linked user account not found")
        
    user.password_hash = get_password_hash(reset_in.new_password)
    record_audit_event(
        db,
        actor=current_user,
        action="doctor.password_reset",
        resource_type="doctor",
        resource_id=str(doc.id),
        new_values={"user_id": user.id},
        **request_audit_metadata(request),
    )
    db.commit()
    return {"status": "success", "message": "Password reset successfully"}

@router.put("/doctors/{id}", response_model=DoctorResponse)
def admin_update_doctor(
    id: int,
    doc_in: DoctorCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctors_manage),
):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc: raise HTTPException(status_code=404)
    old_values = {
        "name": doc.name,
        "specialization": doc.specialization,
        "department_id": doc.department_id,
        "consultation_fee": doc.consultation_fee,
        "timing_start": doc.timing_start,
        "timing_end": doc.timing_end,
        "contact": doc.contact,
        "status": doc.status,
    }
    doc.name = doc_in.name
    doc.specialization = doc_in.specialization
    doc.department_id = doc_in.department_id
    doc.consultation_fee = doc_in.consultation_fee
    doc.timing_start = doc_in.timing_start
    doc.timing_end = doc_in.timing_end
    doc.contact = doc_in.contact
    doc.status = doc_in.status
    
    user = db.query(User).filter(User.id == doc.user_id).first()
    if user:
        if doc_in.email and doc_in.email != user.email:
            existing = db.query(User).filter(User.email == doc_in.email, User.id != user.id).first()
            if existing:
                raise HTTPException(status_code=409, detail="Email already registered")
            user.email = doc_in.email
        doc.email = user.email

    new_values = {
        "name": doc.name,
        "specialization": doc.specialization,
        "department_id": doc.department_id,
        "consultation_fee": doc.consultation_fee,
        "timing_start": doc.timing_start,
        "timing_end": doc.timing_end,
        "contact": doc.contact,
        "status": doc.status,
        "email": user.email if user else None,
    }
    record_audit_event(
        db,
        actor=current_user,
        action="doctor.updated",
        resource_type="doctor",
        resource_id=str(doc.id),
        old_values=old_values,
        new_values=new_values,
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(doc)
    if user:
        doc.email = user.email
    return doc

@router.delete("/doctors/{id}")
def admin_delete_doctor(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_doctors_manage),
):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc: raise HTTPException(status_code=404)
    record_audit_event(
        db,
        actor=current_user,
        action="doctor.deleted",
        resource_type="doctor",
        resource_id=str(doc.id),
        old_values={"user_id": doc.user_id, "name": doc.name, "status": doc.status},
        **request_audit_metadata(request),
    )
    db.delete(doc)
    db.commit()
    return {"status": "deleted"}

@router.get("/patients", response_model=List[PatientResponse])
def admin_get_patients(db: Session = Depends(get_db), current_user: User = Depends(allow_patients_view)):
    return db.query(Patient).all()

@router.get("/appointments", response_model=List[AppointmentResponse])
def admin_get_appointments(db: Session = Depends(get_db), current_user: User = Depends(allow_appointments_view)):
    return db.query(Appointment).order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc()).all()

@router.get("/billing/report")
def get_billing_report(db: Session = Depends(get_db), current_user: User = Depends(allow_billing_report)):
    paid_total = db.query(func.sum(Billing.amount)).filter(Billing.status == 'paid').scalar() or 0
    pending_total = db.query(func.sum(Billing.amount)).filter(Billing.status == 'pending').scalar() or 0
    recent = db.query(Billing).order_by(Billing.created_at.desc()).limit(50).all()
    
    return {
        "paid_total": float(paid_total),
        "pending_total": float(pending_total),
        "recent_transactions": recent
    }

@router.get("/settings", response_model=HospitalSettingResponse)
def get_settings(db: Session = Depends(get_db), current_user = Depends(allow_settings_view)):
    setting = db.query(HospitalSetting).first()
    if not setting:
        setting = HospitalSetting(hospital_name="Demo Hospital", address="123 Health St", phone="555-0100", gstin="GSTIN123456")
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting
