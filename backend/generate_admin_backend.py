import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\backend\app\routers"

admin_router = """from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.all_models import Doctor, Patient, Appointment, Billing, User, HospitalSetting
from app.schemas.all_schemas import DoctorResponse, DoctorCreate, PatientResponse, AppointmentResponse, HospitalSettingResponse
from typing import List
from datetime import date
from app.core.deps import get_current_user, RoleChecker

router = APIRouter()
allow_admin = RoleChecker(["admin"])

@router.get("/overview")
def get_overview(db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    today = date.today()
    total_patients = db.query(Patient).count()
    total_doctors = db.query(Doctor).count()
    today_appts = db.query(Appointment).filter(Appointment.appt_date == today).count()
    pending_bills = db.query(Billing).filter(Billing.status == 'pending').count()
    
    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "today_appointments": today_appts,
        "pending_bills": pending_bills
    }

@router.get("/doctors", response_model=List[DoctorResponse])
def admin_get_doctors(db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    return db.query(Doctor).all()

@router.post("/doctors", response_model=DoctorResponse)
def admin_create_doctor(doc_in: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    new_doc = Doctor(
        name=doc_in.name,
        specialization=doc_in.specialization,
        timing_start=doc_in.timing_start,
        timing_end=doc_in.timing_end,
        contact=doc_in.contact,
        status=doc_in.status
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

@router.put("/doctors/{id}", response_model=DoctorResponse)
def admin_update_doctor(id: int, doc_in: DoctorCreate, db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc: raise HTTPException(status_code=404)
    doc.name = doc_in.name
    doc.specialization = doc_in.specialization
    doc.timing_start = doc_in.timing_start
    doc.timing_end = doc_in.timing_end
    doc.contact = doc_in.contact
    doc.status = doc_in.status
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/doctors/{id}")
def admin_delete_doctor(id: int, db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    doc = db.query(Doctor).filter(Doctor.id == id).first()
    if not doc: raise HTTPException(status_code=404)
    db.delete(doc)
    db.commit()
    return {"status": "deleted"}

@router.get("/patients", response_model=List[PatientResponse])
def admin_get_patients(db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    return db.query(Patient).all()

@router.get("/appointments", response_model=List[AppointmentResponse])
def admin_get_appointments(db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    return db.query(Appointment).order_by(Appointment.appt_date.desc(), Appointment.appt_time.desc()).all()

@router.get("/billing/report")
def get_billing_report(db: Session = Depends(get_db), current_user: User = Depends(allow_admin)):
    paid_total = db.query(func.sum(Billing.amount)).filter(Billing.status == 'paid').scalar() or 0
    pending_total = db.query(func.sum(Billing.amount)).filter(Billing.status == 'pending').scalar() or 0
    recent = db.query(Billing).order_by(Billing.created_at.desc()).limit(50).all()
    
    return {
        "paid_total": float(paid_total),
        "pending_total": float(pending_total),
        "recent_transactions": recent
    }

@router.get("/settings", response_model=HospitalSettingResponse)
def get_settings(db: Session = Depends(get_db), current_user = Depends(get_current_user)):
    setting = db.query(HospitalSetting).first()
    if not setting:
        setting = HospitalSetting(hospital_name="Demo Hospital", address="123 Health St", phone="555-0100", gstin="GSTIN123456")
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting
"""

files = {
    "admin.py": admin_router
}

for f, content in files.items():
    with open(os.path.join(base_dir, f), "w", encoding="utf-8") as fp:
        fp.write(content)

print("Backend admin router updated successfully.")
