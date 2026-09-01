from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from decimal import Decimal

from app.database import get_db
from app.models.all_models import (
    User, Billing, InsuranceProvider, InsurancePolicy, InsuranceClaim, InsuranceClaimItem, InsuranceDocument, InsurancePayment, AuditLog
)
from app.schemas.all_schemas import (
    InsuranceProviderCreate, InsuranceProviderResponse, InsurancePolicyCreate, InsurancePolicyResponse,
    InsuranceClaimCreate, InsuranceClaimStatusUpdate, InsuranceClaimResponse,
    InsuranceClaimItemResponse, InsuranceDocumentCreate, InsuranceDocumentResponse,
    InsurancePaymentCreate, InsurancePaymentResponse
)
from app.core.deps import require_permission
from app.core.permissions import Permission
from app.services.audit_service import record_audit_event, request_audit_metadata

router = APIRouter(
    prefix="/insurance",
    tags=["insurance"],
)

CLAIM_TRANSITIONS = {
    "draft": {"submitted", "cancelled"},
    "submitted": {"under_review", "cancelled"},
    "under_review": {"approved", "partially_approved", "rejected"},
    "approved": set(),
    "partially_approved": set(),
    "rejected": set(),
    "settled": set(),
    "cancelled": set(),
}

def log_audit(db: Session, actor_id: int, action: str, resource_type: str, resource_id: str, old_val: dict = None, new_val: dict = None):
    log = AuditLog(
        actor_user_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        old_values=old_val,
        new_values=new_val
    )
    db.add(log)
    # let caller commit

@router.get("/dashboard")
def get_insurance_dashboard(db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.insurance_view))):
    active_policies = db.query(InsurancePolicy).filter(InsurancePolicy.status == 'active').count()
    pending_claims = db.query(InsuranceClaim).filter(InsuranceClaim.status.in_(['submitted', 'under_review'])).count()
    total_settled_amount = db.query(func.sum(InsurancePayment.amount_paid)).scalar() or 0.0
    
    return {
        "active_policies": active_policies,
        "pending_claims": pending_claims,
        "total_settled_amount": float(total_settled_amount)
    }

@router.get("/providers", response_model=List[InsuranceProviderResponse])
def get_insurance_providers(db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.insurance_view))):
    return db.query(InsuranceProvider).order_by(InsuranceProvider.name).all()


@router.post("/providers", response_model=InsuranceProviderResponse, status_code=201)
def create_insurance_provider(
    payload: InsuranceProviderCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.insurance_create)),
):
    item = InsuranceProvider(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="insurance.provider_created",
        resource_type="insurance_provider", resource_id=str(item.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item

@router.get("/policies", response_model=List[InsurancePolicyResponse])
def get_insurance_policies(patient_id: int = None, db: Session = Depends(get_db), _: User = Depends(require_permission(Permission.insurance_view))):
    query = db.query(InsurancePolicy)
    if patient_id:
        query = query.filter(InsurancePolicy.patient_id == patient_id)
    return query.order_by(InsurancePolicy.coverage_end.desc()).all()


@router.post("/policies", response_model=InsurancePolicyResponse, status_code=201)
def create_insurance_policy(
    payload: InsurancePolicyCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.insurance_create)),
):
    if not db.query(InsuranceProvider).filter_by(id=payload.provider_id, status="active").first():
        raise HTTPException(status_code=400, detail="Insurance provider is invalid or inactive")
    from app.models.all_models import Patient
    if not db.get(Patient, payload.patient_id):
        raise HTTPException(status_code=400, detail="Patient does not exist")
    if db.query(InsurancePolicy).filter_by(
        provider_id=payload.provider_id, policy_number=payload.policy_number,
    ).first():
        raise HTTPException(status_code=409, detail="Policy number already exists for this provider")
    item = InsurancePolicy(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="insurance.policy_created",
        resource_type="insurance_policy", resource_id=str(item.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/claims", response_model=List[InsuranceClaimResponse])
def list_claims(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.insurance_view)),
):
    return db.query(InsuranceClaim).order_by(InsuranceClaim.updated_at.desc()).all()

@router.post("/claims", response_model=InsuranceClaimResponse)
def create_claim(
    claim_in: InsuranceClaimCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.insurance_claim)),
):
    policy = db.query(InsurancePolicy).filter(InsurancePolicy.id == claim_in.policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    if policy.status != 'active' or not (policy.coverage_start <= date.today() <= policy.coverage_end):
        raise HTTPException(status_code=400, detail="Cannot create claim against inactive policy")
    if policy.coverage_limit is not None and claim_in.amount_claimed > policy.coverage_limit:
        raise HTTPException(status_code=400, detail="Claim amount exceeds the policy coverage limit")
    if claim_in.billing_id is not None:
        bill = db.get(Billing, claim_in.billing_id)
        if not bill or bill.patient_id != policy.patient_id:
            raise HTTPException(status_code=400, detail="Bill does not belong to the policy patient")
        if claim_in.amount_claimed > bill.amount:
            raise HTTPException(status_code=400, detail="Claim amount exceeds the bill amount")
        
    new_claim = InsuranceClaim(
        **claim_in.model_dump(),
        officer_id=current_user.id,
        status='draft'
    )
    db.add(new_claim)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="insurance.claim_created",
        resource_type="insurance_claim", resource_id=str(new_claim.id),
        new_values=claim_in.model_dump(),
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(new_claim)
    return new_claim

@router.put("/claims/{claim_id}/status", response_model=InsuranceClaimResponse)
def update_claim_status(
    claim_id: int, status_update: InsuranceClaimStatusUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.insurance_approve)),
):
    claim = db.query(InsuranceClaim).filter(InsuranceClaim.id == claim_id).with_for_update().first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    if status_update.status == claim.status:
        return claim
    if status_update.status not in CLAIM_TRANSITIONS[claim.status]:
        raise HTTPException(status_code=409, detail=f"Cannot transition claim from {claim.status} to {status_update.status}")
    if status_update.status in ("approved", "partially_approved"):
        approved_amount = status_update.approved_amount
        if approved_amount is None:
            approved_amount = claim.amount_claimed if status_update.status == "approved" else None
        if approved_amount is None or approved_amount <= 0 or approved_amount > claim.amount_claimed:
            raise HTTPException(status_code=400, detail="A valid approved amount is required")
        if status_update.status == "partially_approved" and approved_amount >= claim.amount_claimed:
            raise HTTPException(status_code=400, detail="Partial approval must be less than the claimed amount")
        claim.approved_amount = approved_amount
        
    old_status = claim.status
    claim.status = status_update.status
    record_audit_event(
        db, actor=current_user, action="insurance.claim_status_changed",
        resource_type="insurance_claim", resource_id=str(claim.id),
        old_values={"status": old_status},
        new_values={"status": claim.status, "approved_amount": claim.approved_amount},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(claim)
    return claim

@router.get("/documents", response_model=List[InsuranceDocumentResponse])
def list_documents(
    claim_id: int | None = None, db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.insurance_view)),
):
    query = db.query(InsuranceDocument)
    if claim_id is not None:
        query = query.filter(InsuranceDocument.claim_id == claim_id)
    return query.order_by(InsuranceDocument.uploaded_at.desc()).all()


@router.post("/documents", response_model=InsuranceDocumentResponse, status_code=201)
def create_document(
    payload: InsuranceDocumentCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.insurance_claim)),
):
    if not db.get(InsuranceClaim, payload.claim_id):
        raise HTTPException(status_code=404, detail="Claim not found")
    item = InsuranceDocument(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="insurance.document_linked",
        resource_type="insurance_document", resource_id=str(item.id),
        new_values={"claim_id": item.claim_id}, **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/payments", response_model=List[InsurancePaymentResponse])
def list_payments(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.insurance_view)),
):
    return db.query(InsurancePayment).order_by(InsurancePayment.payment_date.desc()).all()


@router.post("/payments", response_model=InsurancePaymentResponse, status_code=201)
def record_insurance_payment(
    payment_in: InsurancePaymentCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.insurance_approve)),
):
    existing = db.query(InsurancePayment).filter_by(
        transaction_reference=payment_in.transaction_reference,
    ).first()
    if existing:
        return existing
    claim = db.query(InsuranceClaim).filter(InsuranceClaim.id == payment_in.claim_id).with_for_update().first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    if claim.status not in ['approved', 'partially_approved']:
        raise HTTPException(status_code=400, detail="Cannot record payment for a claim that is not approved")
    approved_amount = claim.approved_amount or claim.amount_claimed
    paid_total = db.query(func.sum(InsurancePayment.amount_paid)).filter(
        InsurancePayment.claim_id == claim.id,
    ).scalar() or Decimal("0.00")
    if paid_total + payment_in.amount_paid > approved_amount:
        raise HTTPException(status_code=400, detail="Payment exceeds the approved claim amount")
        
    new_payment = InsurancePayment(
        **payment_in.model_dump(),
        recorded_by=current_user.id
    )
    db.add(new_payment)
    
    if paid_total + payment_in.amount_paid == approved_amount:
        claim.status = 'settled'
    db.flush()
    record_audit_event(
        db, actor=current_user, action="insurance.payment_recorded",
        resource_type="insurance_payment", resource_id=str(new_payment.id),
        new_values=payment_in.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(new_payment)
    return new_payment


# Export the finalized exact-role Insurance Officer workflow.
from app.routers.insurance_workflow import router as router
