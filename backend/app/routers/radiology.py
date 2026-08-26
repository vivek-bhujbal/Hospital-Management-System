from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import (
    Appointment, Doctor, Patient, RadiologyModality, RadiologyOrder,
    RadiologyReport, RadiologyStudy, User,
)
from app.schemas.all_schemas import (
    RadiologyModalityCreate, RadiologyModalityResponse, RadiologyOrderCreate,
    RadiologyOrderResponse, RadiologyReportCreate, RadiologyReportResponse,
    RadiologyReportUpdate, RadiologyStudyCreate, RadiologyStudyResponse,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(prefix="/radiology", tags=["radiology"])


def _scope_orders(query, current_user: User):
    if current_user.role == UserRole.doctor.value:
        return query.filter(RadiologyOrder.doctor_id == current_user.id)
    return query


@router.get("/dashboard")
def get_radiology_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.radiology_view)),
):
    return {
        "pending_orders": db.query(RadiologyOrder).filter(RadiologyOrder.status == "ordered").count(),
        "unverified_reports": db.query(RadiologyReport).filter(RadiologyReport.status == "draft").count(),
    }


@router.get("/modalities", response_model=List[RadiologyModalityResponse])
def list_modalities(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.radiology_view)),
):
    return db.query(RadiologyModality).order_by(RadiologyModality.name).all()


@router.post("/modalities", response_model=RadiologyModalityResponse, status_code=201)
def create_modality(
    payload: RadiologyModalityCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_report)),
):
    item = RadiologyModality(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="radiology.modality_created",
        resource_type="radiology_modality", resource_id=str(item.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/orders", response_model=RadiologyOrderResponse, status_code=201)
def create_order(
    payload: RadiologyOrderCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_order)),
):
    if current_user.role != UserRole.doctor.value:
        raise HTTPException(status_code=403, detail="Only a doctor may place a radiology order")
    patient = db.get(Patient, payload.patient_id)
    doctor = db.query(Doctor).filter_by(user_id=current_user.id).first()
    modality = db.get(RadiologyModality, payload.modality_id)
    if not patient or not doctor:
        raise HTTPException(status_code=400, detail="Doctor or patient profile is missing")
    if not modality or modality.status != "active":
        raise HTTPException(status_code=400, detail="Radiology modality is invalid or inactive")
    if payload.appointment_id:
        appointment = db.get(Appointment, payload.appointment_id)
        if not appointment or appointment.patient_id != patient.id or appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=400, detail="Appointment is not assigned to this doctor and patient")
    item = RadiologyOrder(
        **payload.model_dump(), doctor_id=current_user.id, status="ordered",
    )
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="radiology.order_created", resource_type="radiology_order",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/orders", response_model=List[RadiologyOrderResponse])
def get_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_view)),
):
    return _scope_orders(db.query(RadiologyOrder), current_user).order_by(RadiologyOrder.ordered_at.desc()).all()


@router.post("/studies", response_model=RadiologyStudyResponse, status_code=201)
def create_study(
    payload: RadiologyStudyCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_report)),
):
    order = db.query(RadiologyOrder).filter(RadiologyOrder.id == payload.order_id).with_for_update().first()
    if not order:
        raise HTTPException(status_code=404, detail="Radiology order not found")
    if order.status not in ("ordered", "scheduled"):
        existing = db.query(RadiologyStudy).filter_by(order_id=order.id).first()
        if existing and existing.study_identifier == payload.study_identifier:
            return existing
        raise HTTPException(status_code=409, detail="A study cannot be recorded in the current order state")
    if db.query(RadiologyStudy).filter_by(study_identifier=payload.study_identifier).first():
        raise HTTPException(status_code=409, detail="Study identifier already exists")
    item = RadiologyStudy(**payload.model_dump(), technician_id=current_user.id)
    db.add(item)
    order.status = "performed"
    db.flush()
    record_audit_event(
        db, actor=current_user, action="radiology.study_recorded", resource_type="radiology_study",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/studies", response_model=List[RadiologyStudyResponse])
def list_studies(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_view)),
):
    query = db.query(RadiologyStudy).join(RadiologyOrder, RadiologyStudy.order_id == RadiologyOrder.id)
    return _scope_orders(query, current_user).order_by(RadiologyStudy.performed_at.desc()).limit(200).all()


@router.get("/reports", response_model=List[RadiologyReportResponse])
def list_reports(
    verified_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_view)),
):
    query = db.query(RadiologyReport).join(RadiologyStudy).join(RadiologyOrder)
    query = _scope_orders(query, current_user)
    if verified_only:
        query = query.filter(RadiologyReport.status == "verified")
    return query.order_by(RadiologyReport.created_at.desc()).limit(200).all()


@router.post("/reports", response_model=RadiologyReportResponse, status_code=201)
def create_report(
    payload: RadiologyReportCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_report)),
):
    study = db.get(RadiologyStudy, payload.study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    if db.query(RadiologyReport).filter_by(study_id=study.id).first():
        raise HTTPException(status_code=409, detail="A report already exists for this study")
    item = RadiologyReport(
        **payload.model_dump(), radiologist_id=current_user.id, status="draft", version=1,
    )
    db.add(item)
    order = db.get(RadiologyOrder, study.order_id)
    order.status = "reporting"
    db.flush()
    record_audit_event(
        db, actor=current_user, action="radiology.report_created", resource_type="radiology_report",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/reports/{report_id}", response_model=RadiologyReportResponse)
def update_report(
    report_id: int, payload: RadiologyReportUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_report)),
):
    item = db.get(RadiologyReport, report_id)
    if not item:
        raise HTTPException(status_code=404, detail="Report not found")
    if item.status == "verified":
        raise HTTPException(status_code=409, detail="Verified reports require an amendment")
    if item.radiologist_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the report author may edit this draft")
    changes = payload.model_dump(exclude_unset=True)
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    record_audit_event(
        db, actor=current_user, action="radiology.report_updated", resource_type="radiology_report",
        resource_id=str(item.id), old_values=old_values, new_values=changes,
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/reports/{report_id}/verify", response_model=RadiologyReportResponse)
def verify_report(
    report_id: int, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_verify)),
):
    item = db.get(RadiologyReport, report_id)
    if not item:
        raise HTTPException(status_code=404, detail="Report not found")
    if item.status == "verified":
        return item
    item.status = "verified"
    item.verified_at = datetime.now(timezone.utc)
    study = db.get(RadiologyStudy, item.study_id)
    db.get(RadiologyOrder, study.order_id).status = "verified"
    record_audit_event(
        db, actor=current_user, action="radiology.report_verified", resource_type="radiology_report",
        resource_id=str(item.id), new_values={"status": "verified"},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/reports/{report_id}/amend", response_model=RadiologyReportResponse, status_code=201)
def amend_report(
    report_id: int, payload: RadiologyReportUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.radiology_report)),
):
    parent = db.get(RadiologyReport, report_id)
    if not parent:
        raise HTTPException(status_code=404, detail="Parent report not found")
    if parent.status != "verified":
        raise HTTPException(status_code=409, detail="Only a verified report can be amended")
    existing = db.query(RadiologyReport).filter_by(parent_report_id=parent.id).first()
    if existing:
        return existing
    changes = payload.model_dump(exclude_unset=True)
    item = RadiologyReport(
        study_id=parent.study_id, radiologist_id=current_user.id,
        findings=changes.get("findings", parent.findings),
        impression=changes.get("impression", parent.impression),
        recommendations=changes.get("recommendations", parent.recommendations),
        status="draft", version=parent.version + 1, parent_report_id=parent.id,
    )
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="radiology.report_amended", resource_type="radiology_report",
        resource_id=str(item.id), new_values={"parent_report_id": parent.id, "version": item.version},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item
