from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.all_models import Billing, Patient, User, Employee
from app.schemas.all_schemas import BillingResponse
from typing import List
from app.core.deps import get_current_user, RoleChecker, PermissionChecker
import uuid

router = APIRouter()
allow_patient = RoleChecker(["patient"])
allow_receptionist = RoleChecker(["receptionist", "admin"])
allow_collect = PermissionChecker("can_collect_billing")

@router.get("/me", response_model=List[BillingResponse])
def get_my_bills(db: Session = Depends(get_db), current_user: User = Depends(allow_patient)):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    return db.query(Billing).filter(Billing.patient_id == patient.id).order_by(Billing.created_at.desc()).all()

@router.get("/", response_model=List[BillingResponse])
def get_all_billing(db: Session = Depends(get_db), current_user: User = Depends(allow_receptionist)):
    return db.query(Billing).order_by(Billing.created_at.desc()).all()

@router.post("/{id}/collect", response_model=BillingResponse)
def collect_payment(id: int, payment_method: str, db: Session = Depends(get_db), current_user: User = Depends(allow_collect)):
    bill = db.query(Billing).filter(Billing.id == id).first()
    if not bill: raise HTTPException(status_code=404)
    
    emp = db.query(Employee).filter(Employee.user_id == current_user.id).first() if current_user.role == 'receptionist' else None
    
    bill.status = 'paid'
    bill.payment_method = payment_method
    bill.collected_by = emp.id if emp else None
    bill.receipt_no = "REC-" + str(uuid.uuid4()).split("-")[0].upper()
    bill.paid_at = func.now()
    db.commit()
    db.refresh(bill)
    return bill
