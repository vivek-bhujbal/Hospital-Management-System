from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_exact_role
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import (
    Billing, InsuranceClaim, InsuranceClaimAction, InsuranceDocument,
    InsurancePayment, InsurancePolicy, InsuranceProvider, Patient, User,
)
from app.schemas.all_schemas import (
    InsuranceClaimCreate, InsuranceClaimDecision, InsuranceDocumentCreate,
    InsuranceDocumentRequest, InsurancePolicyCreate, InsuranceProviderCreate,
    InsuranceSettlementCreate,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(
    prefix="/insurance",
    tags=["insurance"],
    dependencies=[Depends(require_exact_role(UserRole.insurance_officer))],
)


def _decimal(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def _claim_query(db: Session):
    return db.query(
        InsuranceClaim, InsurancePolicy, InsuranceProvider, Patient, Billing,
    ).join(
        InsurancePolicy, InsuranceClaim.policy_id == InsurancePolicy.id,
    ).join(
        InsuranceProvider, InsurancePolicy.provider_id == InsuranceProvider.id,
    ).join(
        Patient, InsurancePolicy.patient_id == Patient.id,
    ).outerjoin(Billing, InsuranceClaim.billing_id == Billing.id)


def _claim_record(row) -> dict:
    claim, policy, provider, patient, invoice = row
    return {
        "id": claim.id,
        "patient_id": patient.id,
        "patient_name": patient.name,
        "provider_id": provider.id,
        "provider_name": provider.name,
        "policy_id": policy.id,
        "policy_number": policy.policy_number,
        "policy_status": policy.status,
        "billing_id": claim.billing_id,
        "invoice_amount": invoice.amount if invoice else None,
        "amount_claimed": claim.amount_claimed,
        "approved_amount": claim.approved_amount,
        "status": claim.status,
        "documents_required": bool(claim.documents_required),
        "officer_id": claim.officer_id,
        "submitted_at": claim.submitted_at,
        "decided_at": claim.decided_at,
        "settled_at": claim.settled_at,
        "created_at": claim.created_at,
        "updated_at": claim.updated_at,
    }


def _get_claim_row(db: Session, claim_id: int, *, lock: bool = False):
    query = _claim_query(db).filter(InsuranceClaim.id == claim_id)
    if lock:
        query = query.with_for_update()
    row = query.first()
    if not row:
        raise HTTPException(status_code=404, detail="Claim not found")
    return row


def _record_action(
    db: Session,
    request: Request,
    officer: User,
    claim: InsuranceClaim,
    *,
    action: str,
    from_status: str | None,
    to_status: str | None,
    reason: str | None,
    extra: dict | None = None,
) -> None:
    db.add(InsuranceClaimAction(
        claim_id=claim.id,
        officer_id=officer.id,
        action=action,
        from_status=from_status,
        to_status=to_status,
        reason=reason,
    ))
    values = {"action": action, "status": to_status, "reason": reason, **(extra or {})}
    record_audit_event(
        db, actor=officer, action=f"insurance.claim_{action}",
        resource_type="insurance_claim", resource_id=str(claim.id),
        old_values={"status": from_status} if from_status else None,
        new_values=values, **request_audit_metadata(request),
    )


def _require_status(claim: InsuranceClaim, *allowed: str) -> None:
    if claim.status not in allowed:
        raise HTTPException(
            status_code=409,
            detail=f"Claim in status '{claim.status}' cannot perform this action",
        )


@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    counts = {
        status: db.query(InsuranceClaim).filter(InsuranceClaim.status == status).count()
        for status in ("submitted", "under_review", "approved", "rejected")
    }
    return {
        "pending_claims": counts["submitted"],
        "claims_under_review": counts["under_review"],
        "approved_claims": counts["approved"],
        "rejected_claims": counts["rejected"],
        "claims_requiring_documents": db.query(InsuranceClaim).filter(
            InsuranceClaim.documents_required.is_(True),
        ).count(),
        "total_claimed_amount": _decimal(db.query(func.sum(InsuranceClaim.amount_claimed)).scalar()),
        "approved_amount": _decimal(db.query(func.sum(InsuranceClaim.approved_amount)).filter(
            InsuranceClaim.status.in_(("approved", "settled")),
        ).scalar()),
    }


@router.get("/providers")
def get_providers(db: Session = Depends(get_db)):
    return db.query(InsuranceProvider).order_by(InsuranceProvider.name).all()


@router.post("/providers", status_code=201)
def create_provider(
    payload: InsuranceProviderCreate,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    name = " ".join(payload.name.split())
    if db.query(InsuranceProvider).filter(func.lower(InsuranceProvider.name) == name.lower()).first():
        raise HTTPException(status_code=409, detail="Insurance provider already exists")
    provider = InsuranceProvider(
        name=name, contact_info=payload.contact_info, status=payload.status,
    )
    db.add(provider)
    db.flush()
    record_audit_event(
        db, actor=officer, action="insurance.provider_created",
        resource_type="insurance_provider", resource_id=str(provider.id),
        new_values={"name": provider.name, "status": provider.status},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(provider)
    return provider


@router.get("/patients")
def get_insurance_patients(search: str | None = None, db: Session = Depends(get_db)):
    query = db.query(Patient, InsurancePolicy, InsuranceProvider).outerjoin(
        InsurancePolicy, InsurancePolicy.patient_id == Patient.id,
    ).outerjoin(
        InsuranceProvider, InsurancePolicy.provider_id == InsuranceProvider.id,
    )
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(
            Patient.name.ilike(term), InsurancePolicy.policy_number.ilike(term),
            InsuranceProvider.name.ilike(term),
        ))
    return [{
        "patient_id": patient.id,
        "patient_name": patient.name,
        "provider_id": provider.id if provider else None,
        "provider_name": provider.name if provider else None,
        "policy_id": policy.id if policy else None,
        "policy_number": policy.policy_number if policy else None,
        "policy_status": policy.status if policy else None,
        "coverage_start": policy.coverage_start if policy else None,
        "coverage_end": policy.coverage_end if policy else None,
        "coverage_limit": policy.coverage_limit if policy else None,
    } for patient, policy, provider in query.order_by(Patient.name).all()]


@router.post("/policies", status_code=201)
def create_policy(
    payload: InsurancePolicyCreate,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    if not db.get(Patient, payload.patient_id):
        raise HTTPException(status_code=400, detail="Patient does not exist")
    if not db.query(InsuranceProvider).filter_by(id=payload.provider_id, status="active").first():
        raise HTTPException(status_code=400, detail="Insurance provider is invalid or inactive")
    if db.query(InsurancePolicy).filter_by(
        provider_id=payload.provider_id, policy_number=payload.policy_number,
    ).first():
        raise HTTPException(status_code=409, detail="Policy number already exists for this provider")
    policy = InsurancePolicy(**payload.model_dump())
    db.add(policy)
    db.flush()
    record_audit_event(
        db, actor=officer, action="insurance.policy_created",
        resource_type="insurance_policy", resource_id=str(policy.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(policy)
    return policy


@router.get("/claim-options")
def get_claim_options(db: Session = Depends(get_db)):
    today = date.today()
    policies = db.query(InsurancePolicy, InsuranceProvider, Patient).join(
        InsuranceProvider, InsurancePolicy.provider_id == InsuranceProvider.id,
    ).join(Patient, InsurancePolicy.patient_id == Patient.id).filter(
        InsurancePolicy.status == "active",
        InsurancePolicy.coverage_start <= today,
        InsurancePolicy.coverage_end >= today,
    ).order_by(Patient.name).all()
    claimed_invoice_ids = db.query(InsuranceClaim.billing_id).filter(
        InsuranceClaim.billing_id.is_not(None),
    )
    invoices = db.query(Billing, Patient).join(
        Patient, Billing.patient_id == Patient.id,
    ).filter(~Billing.id.in_(claimed_invoice_ids)).order_by(Billing.created_at.desc()).all()
    return {
        "policies": [{
            "id": policy.id, "patient_id": patient.id, "patient_name": patient.name,
            "provider_name": provider.name, "policy_number": policy.policy_number,
            "coverage_limit": policy.coverage_limit,
        } for policy, provider, patient in policies],
        "invoices": [{
            "id": invoice.id, "patient_id": patient.id, "patient_name": patient.name,
            "amount": invoice.amount, "status": invoice.status,
        } for invoice, patient in invoices],
    }


@router.get("/claims")
def get_claims(
    search: str | None = None,
    status: Literal["draft", "submitted", "under_review", "approved", "rejected", "settled"] | None = None,
    db: Session = Depends(get_db),
):
    query = _claim_query(db)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(
            Patient.name.ilike(term), InsurancePolicy.policy_number.ilike(term),
            InsuranceProvider.name.ilike(term),
        ))
    if status:
        query = query.filter(InsuranceClaim.status == status)
    return [_claim_record(row) for row in query.order_by(InsuranceClaim.updated_at.desc()).all()]


@router.post("/claims", status_code=201)
def create_claim(
    payload: InsuranceClaimCreate,
    request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    policy = db.get(InsurancePolicy, payload.policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    if policy.status != "active" or not (policy.coverage_start <= date.today() <= policy.coverage_end):
        raise HTTPException(status_code=400, detail="Cannot create claim against inactive policy")
    invoice = db.get(Billing, payload.billing_id)
    if not invoice or invoice.patient_id != policy.patient_id:
        raise HTTPException(status_code=400, detail="Invoice does not belong to the policy patient")
    if payload.amount_claimed > invoice.amount:
        raise HTTPException(status_code=400, detail="Claim amount exceeds the invoice amount")
    if policy.coverage_limit is not None and payload.amount_claimed > policy.coverage_limit:
        raise HTTPException(status_code=400, detail="Claim amount exceeds the policy coverage limit")
    if db.query(InsuranceClaim).filter(InsuranceClaim.billing_id == payload.billing_id).first():
        raise HTTPException(status_code=409, detail="An insurance claim already exists for this invoice")
    claim = InsuranceClaim(
        policy_id=payload.policy_id, billing_id=payload.billing_id,
        amount_claimed=payload.amount_claimed, officer_id=officer.id, status="draft",
    )
    db.add(claim)
    db.flush()
    _record_action(
        db, request, officer, claim, action="created",
        from_status=None, to_status="draft", reason=None,
        extra={"billing_id": claim.billing_id, "amount_claimed": claim.amount_claimed},
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An insurance claim already exists for this invoice")
    return _claim_record(_get_claim_row(db, claim.id))


@router.get("/claims/{claim_id}")
def get_claim_detail(claim_id: int, db: Session = Depends(get_db)):
    result = _claim_record(_get_claim_row(db, claim_id))
    documents = db.query(InsuranceDocument, User).outerjoin(
        User, InsuranceDocument.linked_by == User.id,
    ).filter(InsuranceDocument.claim_id == claim_id).order_by(InsuranceDocument.uploaded_at.desc()).all()
    history = db.query(InsuranceClaimAction, User).join(
        User, InsuranceClaimAction.officer_id == User.id,
    ).filter(InsuranceClaimAction.claim_id == claim_id).order_by(InsuranceClaimAction.created_at.desc(), InsuranceClaimAction.id.desc()).all()
    payments = db.query(InsurancePayment, User).join(
        User, InsurancePayment.recorded_by == User.id,
    ).filter(InsurancePayment.claim_id == claim_id).order_by(InsurancePayment.payment_date.desc()).all()
    return {
        **result,
        "documents": [{
            "id": document.id, "document_reference": document.document_reference,
            "linked_by": officer.id if officer else None,
            "linked_by_name": officer.name if officer else None,
            "uploaded_at": document.uploaded_at,
        } for document, officer in documents],
        "history": [{
            "id": action.id, "action": action.action,
            "from_status": action.from_status, "to_status": action.to_status,
            "reason": action.reason, "officer_id": officer.id,
            "officer_name": officer.name, "created_at": action.created_at,
        } for action, officer in history],
        "payments": [{
            "id": payment.id, "amount_paid": payment.amount_paid,
            "payment_date": payment.payment_date,
            "transaction_reference": payment.transaction_reference,
            "recorded_by_name": officer.name,
        } for payment, officer in payments],
    }


@router.post("/claims/{claim_id}/submit")
def submit_claim(
    claim_id: int, request: Request, db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    claim = _get_claim_row(db, claim_id, lock=True)[0]
    _require_status(claim, "draft")
    claim.status = "submitted"
    claim.submitted_at = func.now()
    _record_action(db, request, officer, claim, action="submitted", from_status="draft", to_status="submitted", reason=None)
    db.commit()
    return _claim_record(_get_claim_row(db, claim_id))


@router.post("/claims/{claim_id}/start-review")
def start_review(
    claim_id: int, request: Request, db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    claim = _get_claim_row(db, claim_id, lock=True)[0]
    _require_status(claim, "submitted")
    if claim.documents_required:
        raise HTTPException(status_code=409, detail="Required claim documents have not been supplied")
    claim.status = "under_review"
    _record_action(db, request, officer, claim, action="review_started", from_status="submitted", to_status="under_review", reason=None)
    db.commit()
    return _claim_record(_get_claim_row(db, claim_id))


@router.post("/claims/{claim_id}/request-documents")
def request_documents(
    claim_id: int, payload: InsuranceDocumentRequest, request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    claim = _get_claim_row(db, claim_id, lock=True)[0]
    _require_status(claim, "submitted", "under_review")
    claim.documents_required = True
    _record_action(
        db, request, officer, claim, action="documents_requested",
        from_status=claim.status, to_status=claim.status, reason=payload.reason,
    )
    db.commit()
    return _claim_record(_get_claim_row(db, claim_id))


@router.post("/claims/{claim_id}/documents", status_code=201)
def link_document(
    claim_id: int, payload: InsuranceDocumentCreate, request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    if payload.claim_id != claim_id:
        raise HTTPException(status_code=400, detail="Claim ID does not match the document")
    claim = _get_claim_row(db, claim_id, lock=True)[0]
    _require_status(claim, "draft", "submitted", "under_review")
    if db.query(InsuranceDocument).filter_by(
        claim_id=claim_id, document_reference=payload.document_reference,
    ).first():
        raise HTTPException(status_code=409, detail="Document reference is already linked to this claim")
    document = InsuranceDocument(
        claim_id=claim_id, document_reference=payload.document_reference,
        linked_by=officer.id,
    )
    db.add(document)
    claim.documents_required = False
    db.flush()
    _record_action(
        db, request, officer, claim, action="document_linked",
        from_status=claim.status, to_status=claim.status,
        reason=payload.document_reference, extra={"document_id": document.id},
    )
    db.commit()
    return {"id": document.id, "claim_id": claim_id, "document_reference": document.document_reference}


@router.post("/claims/{claim_id}/decision")
def decide_claim(
    claim_id: int, payload: InsuranceClaimDecision, request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    claim = _get_claim_row(db, claim_id, lock=True)[0]
    _require_status(claim, "under_review")
    if claim.documents_required:
        raise HTTPException(status_code=409, detail="Required claim documents have not been supplied")
    old_status = claim.status
    if payload.decision == "approved":
        approved_amount = payload.approved_amount or claim.amount_claimed
        if approved_amount > claim.amount_claimed:
            raise HTTPException(status_code=400, detail="Approved amount cannot exceed claimed amount")
        claim.approved_amount = approved_amount
    else:
        claim.approved_amount = None
    claim.status = payload.decision
    claim.decided_at = func.now()
    _record_action(
        db, request, officer, claim, action=payload.decision,
        from_status=old_status, to_status=claim.status, reason=payload.reason,
        extra={"approved_amount": claim.approved_amount},
    )
    db.commit()
    return _claim_record(_get_claim_row(db, claim_id))


@router.post("/claims/{claim_id}/settle")
def settle_claim(
    claim_id: int, payload: InsuranceSettlementCreate, request: Request,
    db: Session = Depends(get_db),
    officer: User = Depends(require_exact_role(UserRole.insurance_officer)),
):
    claim = _get_claim_row(db, claim_id, lock=True)[0]
    _require_status(claim, "approved")
    existing = db.query(InsurancePayment).filter_by(
        transaction_reference=payload.transaction_reference,
    ).first()
    if existing:
        if existing.claim_id == claim_id:
            return _claim_record(_get_claim_row(db, claim_id))
        raise HTTPException(status_code=409, detail="Settlement reference is already in use")
    approved_amount = _decimal(claim.approved_amount or claim.amount_claimed)
    paid_total = _decimal(db.query(func.sum(InsurancePayment.amount_paid)).filter(
        InsurancePayment.claim_id == claim.id,
    ).scalar())
    if paid_total + payload.amount_paid > approved_amount:
        raise HTTPException(status_code=400, detail="Settlement exceeds the approved amount")
    payment = InsurancePayment(
        claim_id=claim.id, amount_paid=payload.amount_paid,
        payment_date=payload.payment_date,
        transaction_reference=payload.transaction_reference,
        recorded_by=officer.id,
    )
    db.add(payment)
    old_status = claim.status
    if paid_total + payload.amount_paid == approved_amount:
        claim.status = "settled"
        claim.settled_at = func.now()
    db.flush()
    _record_action(
        db, request, officer, claim, action="settlement_recorded",
        from_status=old_status, to_status=claim.status, reason=payload.reason,
        extra={
            "payment_id": payment.id, "amount_paid": payload.amount_paid,
            "transaction_reference": payload.transaction_reference,
        },
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Settlement reference is already in use")
    return _claim_record(_get_claim_row(db, claim_id))


@router.get("/approvals")
def get_approvals(db: Session = Depends(get_db)):
    rows = _claim_query(db).filter(
        InsuranceClaim.status.in_(("submitted", "under_review")),
    ).order_by(InsuranceClaim.documents_required.desc(), InsuranceClaim.updated_at).all()
    return [_claim_record(row) for row in rows]
