from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_exact_role, require_permission
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import (
    Appointment, Doctor, Patient, RadiologyModality, RadiologyOrder,
    RadiologyReport, RadiologyStudy, User,
)
from app.schemas.all_schemas import (
    RadiologyAmendmentCreate, RadiologyModalityCreate,
    RadiologyModalityResponse, RadiologyOrderCreate, RadiologyOrderResponse,
    RadiologyReportCreate, RadiologyReportUpdate, RadiologyStudyCreate,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(prefix="/radiology", tags=["radiology"])
radiologist_only = require_exact_role(UserRole.radiologist)
doctor_only = require_exact_role(UserRole.doctor)


def _authorized_order(
    db: Session, order_id: int, radiologist: User, *, lock: bool = False,
) -> RadiologyOrder:
    query = db.query(RadiologyOrder).filter(RadiologyOrder.id == order_id)
    if lock:
        query = query.with_for_update()
    order = query.first()
    if not order:
        raise HTTPException(status_code=404, detail="Radiology order not found")
    if order.assigned_radiologist_id not in (None, radiologist.id):
        raise HTTPException(status_code=403, detail="Radiology order is assigned to another radiologist")
    return order


def _report_record(db: Session, report: RadiologyReport):
    study = db.get(RadiologyStudy, report.study_id)
    order = db.get(RadiologyOrder, study.order_id) if study else None
    patient = db.get(Patient, order.patient_id) if order else None
    author = db.get(User, report.radiologist_id)
    return {
        "id": report.id, "study_id": report.study_id,
        "order_id": order.id if order else None,
        "patient_id": patient.id if patient else None,
        "patient_name": patient.name if patient else "Unknown patient",
        "radiologist_id": report.radiologist_id,
        "radiologist_name": author.name if author else "Unknown radiologist",
        "findings": report.findings, "impression": report.impression,
        "recommendations": report.recommendations,
        "radiologist_notes": report.radiologist_notes,
        "amendment_reason": report.amendment_reason,
        "status": report.status, "version": report.version,
        "parent_report_id": report.parent_report_id,
        "created_at": report.created_at, "updated_at": report.updated_at,
        "finalized_at": report.finalized_at,
    }


def _order_record(db: Session, order: RadiologyOrder):
    patient = db.get(Patient, order.patient_id)
    doctor_profile = db.query(Doctor).filter(Doctor.user_id == order.doctor_id).first()
    doctor_user = db.get(User, order.doctor_id)
    modality = db.get(RadiologyModality, order.modality_id)
    study = db.query(RadiologyStudy).filter_by(order_id=order.id).first()
    reports = []
    if study:
        reports = [
            _report_record(db, report)
            for report in db.query(RadiologyReport).filter_by(study_id=study.id)
            .order_by(RadiologyReport.version.desc()).all()
        ]
    return {
        "id": order.id, "patient_id": order.patient_id,
        "patient_name": patient.name if patient else "Unknown patient",
        "patient_age": patient.age if patient else None,
        "patient_gender": patient.gender if patient else None,
        "patient_contact": patient.contact if patient else None,
        "doctor_id": order.doctor_id,
        "doctor_name": doctor_profile.name if doctor_profile else (
            doctor_user.name if doctor_user else "Unknown doctor"
        ),
        "appointment_id": order.appointment_id,
        "assigned_radiologist_id": order.assigned_radiologist_id,
        "modality_id": order.modality_id,
        "modality_name": modality.name if modality else "Unknown modality",
        "body_part": order.body_part, "clinical_indication": order.clinical_notes,
        "priority": order.priority, "status": order.status,
        "review_started_at": order.review_started_at,
        "ordered_at": order.ordered_at,
        "study": {
            "id": study.id, "study_identifier": study.study_identifier,
            "storage_reference": study.storage_reference,
            "performed_at": study.performed_at, "recorded_by": study.technician_id,
        } if study else None,
        "reports": reports,
    }


@router.get("/dashboard")
def get_radiology_dashboard(
    db: Session = Depends(get_db), radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_view)),
):
    visible = or_(
        RadiologyOrder.assigned_radiologist_id.is_(None),
        RadiologyOrder.assigned_radiologist_id == radiologist.id,
    )
    reports = db.query(RadiologyReport).join(RadiologyStudy).join(RadiologyOrder).filter(visible)
    return {
        "pending_imaging_orders": db.query(RadiologyOrder).filter(
            visible, RadiologyOrder.status == "ordered"
        ).count(),
        "scheduled_imaging": db.query(RadiologyOrder).filter(
            visible, RadiologyOrder.status == "scheduled"
        ).count(),
        "studies_awaiting_interpretation": db.query(RadiologyOrder).filter(
            visible, RadiologyOrder.status.in_(("performed", "reviewing"))
        ).count(),
        "reports_pending": reports.filter(RadiologyReport.status == "draft").count(),
        "completed_reports": reports.filter(RadiologyReport.status == "finalized").count(),
        "urgent_cases": db.query(RadiologyOrder).filter(
            visible, RadiologyOrder.priority.in_(("urgent", "stat")),
            RadiologyOrder.status.notin_(("completed", "cancelled")),
        ).count(),
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
    radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_report)),
):
    item = RadiologyModality(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=radiologist, action="radiology.modality_created",
        resource_type="radiology_modality", resource_id=str(item.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/orders", response_model=RadiologyOrderResponse, status_code=201)
def create_order(
    payload: RadiologyOrderCreate, request: Request, db: Session = Depends(get_db),
    doctor_user: User = Depends(doctor_only),
    _: User = Depends(require_permission(Permission.radiology_order)),
):
    patient = db.get(Patient, payload.patient_id)
    doctor = db.query(Doctor).filter_by(user_id=doctor_user.id).first()
    modality = db.get(RadiologyModality, payload.modality_id)
    if not patient or not doctor:
        raise HTTPException(status_code=400, detail="Doctor or patient profile is missing")
    if not modality or modality.status != "active":
        raise HTTPException(status_code=400, detail="Radiology modality is invalid or inactive")
    if payload.appointment_id:
        appointment = db.get(Appointment, payload.appointment_id)
        if not appointment or appointment.patient_id != patient.id or appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=400, detail="Appointment is not assigned to this doctor and patient")
    order = RadiologyOrder(
        **payload.model_dump(), doctor_id=doctor_user.id, status="ordered",
    )
    db.add(order)
    db.flush()
    record_audit_event(
        db, actor=doctor_user, action="radiology.order_created",
        resource_type="radiology_order", resource_id=str(order.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders")
def get_orders(
    db: Session = Depends(get_db), radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_view)),
):
    orders = db.query(RadiologyOrder).filter(or_(
        RadiologyOrder.assigned_radiologist_id.is_(None),
        RadiologyOrder.assigned_radiologist_id == radiologist.id,
    )).order_by(RadiologyOrder.ordered_at.desc()).all()
    return [_order_record(db, order) for order in orders]


@router.get("/orders/{order_id}")
def get_order(
    order_id: int, db: Session = Depends(get_db),
    radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_view)),
):
    return _order_record(db, _authorized_order(db, order_id, radiologist))


@router.post("/orders/{order_id}/study", status_code=201)
def record_study(
    order_id: int, payload: RadiologyStudyCreate, request: Request,
    db: Session = Depends(get_db), radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_report)),
):
    order = _authorized_order(db, order_id, radiologist, lock=True)
    if payload.order_id != order.id:
        raise HTTPException(status_code=400, detail="Study order does not match URL")
    if order.status not in ("ordered", "scheduled"):
        raise HTTPException(status_code=409, detail="Study cannot be recorded in the current order state")
    if db.query(RadiologyStudy).filter_by(order_id=order.id).first():
        raise HTTPException(status_code=409, detail="A study already exists for this order")
    study = RadiologyStudy(
        order_id=order.id, study_identifier=payload.study_identifier,
        storage_reference=payload.storage_reference, technician_id=radiologist.id,
    )
    db.add(study)
    order.status = "performed"
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Study identifier or order already has a study")
    record_audit_event(
        db, actor=radiologist, action="radiology.study_recorded",
        resource_type="radiology_study", resource_id=str(study.id),
        new_values={
            "order_id": order.id, "patient_id": order.patient_id,
            "study_identifier": study.study_identifier,
            "storage_reference": study.storage_reference,
        }, **request_audit_metadata(request),
    )
    db.commit()
    return _order_record(db, order)


@router.post("/orders/{order_id}/start-review")
def start_review(
    order_id: int, request: Request, db: Session = Depends(get_db),
    radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_report)),
):
    order = _authorized_order(db, order_id, radiologist, lock=True)
    if not db.query(RadiologyStudy).filter_by(order_id=order.id).first():
        raise HTTPException(status_code=409, detail="A recorded imaging study is required before review")
    if order.status != "performed":
        raise HTTPException(status_code=409, detail="Review can only start for a performed study")
    order.assigned_radiologist_id = radiologist.id
    order.status = "reviewing"
    order.review_started_at = datetime.now(timezone.utc)
    record_audit_event(
        db, actor=radiologist, action="radiology.review_started",
        resource_type="radiology_order", resource_id=str(order.id),
        new_values={
            "assigned_radiologist_id": radiologist.id,
            "status": "reviewing", "review_started_at": order.review_started_at,
        }, **request_audit_metadata(request),
    )
    db.commit()
    return _order_record(db, order)


@router.get("/reports")
def list_reports(
    db: Session = Depends(get_db), radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_view)),
):
    reports = db.query(RadiologyReport).join(RadiologyStudy).join(RadiologyOrder).filter(
        RadiologyOrder.assigned_radiologist_id == radiologist.id,
    ).order_by(RadiologyReport.created_at.desc()).limit(200).all()
    return [_report_record(db, report) for report in reports]


@router.post("/reports", status_code=201)
def create_report(
    payload: RadiologyReportCreate, request: Request, db: Session = Depends(get_db),
    radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_report)),
):
    study = db.get(RadiologyStudy, payload.study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Imaging study not found")
    order = _authorized_order(db, study.order_id, radiologist, lock=True)
    if order.assigned_radiologist_id != radiologist.id or order.status != "reviewing":
        raise HTTPException(status_code=409, detail="Start your review before creating a report")
    if db.query(RadiologyReport).filter_by(study_id=study.id).first():
        raise HTTPException(status_code=409, detail="A report already exists; use amendment workflow")
    report = RadiologyReport(
        **payload.model_dump(), radiologist_id=radiologist.id,
        status="draft", version=1,
    )
    db.add(report)
    order.status = "reporting"
    db.flush()
    record_audit_event(
        db, actor=radiologist, action="radiology.report_created",
        resource_type="radiology_report", resource_id=str(report.id),
        new_values={
            **payload.model_dump(), "order_id": order.id,
            "patient_id": order.patient_id, "status": "draft", "version": 1,
        }, **request_audit_metadata(request),
    )
    db.commit()
    return _report_record(db, report)


@router.put("/reports/{report_id}")
def update_report(
    report_id: int, payload: RadiologyReportUpdate, request: Request,
    db: Session = Depends(get_db), radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_report)),
):
    report = db.query(RadiologyReport).filter(RadiologyReport.id == report_id).with_for_update().first()
    if not report:
        raise HTTPException(status_code=404, detail="Radiology report not found")
    study = db.get(RadiologyStudy, report.study_id)
    order = _authorized_order(db, study.order_id, radiologist)
    if order.assigned_radiologist_id != radiologist.id or report.radiologist_id != radiologist.id:
        raise HTTPException(status_code=403, detail="Only the assigned report author may edit this draft")
    if report.status == "finalized":
        raise HTTPException(status_code=409, detail="Finalized reports require an explicit amendment")
    changes = payload.model_dump(exclude_unset=True)
    old_values = {key: getattr(report, key) for key in changes}
    for key, value in changes.items():
        setattr(report, key, value)
    record_audit_event(
        db, actor=radiologist, action="radiology.report_updated",
        resource_type="radiology_report", resource_id=str(report.id),
        old_values=old_values, new_values=changes, **request_audit_metadata(request),
    )
    db.commit()
    return _report_record(db, report)


@router.post("/reports/{report_id}/finalize")
def finalize_report(
    report_id: int, request: Request, db: Session = Depends(get_db),
    radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_report)),
):
    report = db.query(RadiologyReport).filter(RadiologyReport.id == report_id).with_for_update().first()
    if not report:
        raise HTTPException(status_code=404, detail="Radiology report not found")
    study = db.get(RadiologyStudy, report.study_id)
    order = _authorized_order(db, study.order_id, radiologist, lock=True)
    if order.assigned_radiologist_id != radiologist.id or report.radiologist_id != radiologist.id:
        raise HTTPException(status_code=403, detail="Only the assigned report author may finalize it")
    if report.status == "finalized":
        raise HTTPException(status_code=409, detail="Radiology report is already finalized")
    if not (report.findings or "").strip() or not (report.impression or "").strip():
        raise HTTPException(status_code=422, detail="Findings and impression are required for finalization")
    report.status = "finalized"
    report.finalized_at = datetime.now(timezone.utc)
    order.status = "completed"
    record_audit_event(
        db, actor=radiologist, action="radiology.report_finalized",
        resource_type="radiology_report", resource_id=str(report.id),
        old_values={"status": "draft"}, new_values={
            "status": "finalized", "version": report.version,
            "order_id": order.id, "patient_id": order.patient_id,
            "radiologist_id": radiologist.id, "finalized_at": report.finalized_at,
        }, **request_audit_metadata(request),
    )
    db.commit()
    return _report_record(db, report)


@router.post("/reports/{report_id}/amend", status_code=201)
def amend_report(
    report_id: int, payload: RadiologyAmendmentCreate, request: Request,
    db: Session = Depends(get_db), radiologist: User = Depends(radiologist_only),
    _: User = Depends(require_permission(Permission.radiology_report)),
):
    parent = db.query(RadiologyReport).filter(RadiologyReport.id == report_id).with_for_update().first()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent report not found")
    study = db.get(RadiologyStudy, parent.study_id)
    order = _authorized_order(db, study.order_id, radiologist, lock=True)
    if order.assigned_radiologist_id != radiologist.id:
        raise HTTPException(status_code=403, detail="Only the assigned radiologist may amend this report")
    if parent.status != "finalized":
        raise HTTPException(status_code=409, detail="Only a finalized report can be amended")
    if db.query(RadiologyReport).filter_by(parent_report_id=parent.id).first():
        raise HTTPException(status_code=409, detail="This report already has an amendment")
    changes = payload.model_dump(exclude_unset=True)
    reason = changes.pop("amendment_reason").strip()
    amendment = RadiologyReport(
        study_id=parent.study_id, radiologist_id=radiologist.id,
        findings=changes.get("findings") or parent.findings,
        impression=changes.get("impression") or parent.impression,
        recommendations=changes.get("recommendations") or parent.recommendations,
        radiologist_notes=changes.get("radiologist_notes") or parent.radiologist_notes,
        amendment_reason=reason, status="draft",
        version=parent.version + 1, parent_report_id=parent.id,
    )
    db.add(amendment)
    order.status = "reporting"
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="An amendment version already exists")
    record_audit_event(
        db, actor=radiologist, action="radiology.report_amendment_created",
        resource_type="radiology_report", resource_id=str(amendment.id),
        new_values={
            "parent_report_id": parent.id, "version": amendment.version,
            "amendment_reason": reason, "order_id": order.id,
        }, **request_audit_metadata(request),
    )
    db.commit()
    return _report_record(db, amendment)
