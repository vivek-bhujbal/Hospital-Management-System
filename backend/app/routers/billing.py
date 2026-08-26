import uuid

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.permissions import Permission
from app.database import get_db
from app.models.all_models import Billing, Employee, FinancialTransaction, Patient, User
from app.schemas.all_schemas import BillingResponse, PaymentMethodEnum
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter()


@router.get("/me", response_model=list[BillingResponse])
def get_my_bills(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.billing_view_self)),
):
    patient = db.query(Patient).filter(Patient.user_id == current_user.id).first()
    if not patient:
        return []
    return db.query(Billing).filter(Billing.patient_id == patient.id).order_by(Billing.created_at.desc()).all()


@router.get("/", response_model=list[BillingResponse])
def get_all_billing(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.billing_view)),
):
    return db.query(Billing).order_by(Billing.created_at.desc()).all()


@router.post("/{billing_id}/collect", response_model=BillingResponse)
def collect_payment(
    billing_id: int,
    payment_method: PaymentMethodEnum,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.billing_collect)),
):
    bill = db.query(Billing).filter(Billing.id == billing_id).with_for_update().first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    method = payment_method.value
    if bill.status == "paid":
        if bill.payment_method == method:
            return bill
        raise HTTPException(status_code=409, detail="Bill was already paid with another payment method")

    employee = (
        db.query(Employee).filter(Employee.user_id == current_user.id).first()
        if current_user.role == "receptionist" else None
    )
    bill.status = "paid"
    bill.payment_method = method
    bill.collected_by = employee.id if employee else None
    bill.receipt_no = f"REC-{uuid.uuid4().hex[:12].upper()}"
    from sqlalchemy import func
    bill.paid_at = func.now()
    transaction = FinancialTransaction(
        transaction_type="payment", amount=bill.amount,
        reference_type="billing", reference_id=bill.id,
        payment_method=method, recorded_by=current_user.id,
    )
    db.add(transaction)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="billing.payment_collected", resource_type="billing",
        resource_id=str(bill.id),
        new_values={"status": "paid", "payment_method": method, "receipt_no": bill.receipt_no},
        **request_audit_metadata(request),
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        bill = db.get(Billing, billing_id)
        if bill and bill.status == "paid" and bill.payment_method == method:
            return bill
        raise HTTPException(status_code=409, detail="Payment collection conflicted with another request")
    db.refresh(bill)
    return bill
