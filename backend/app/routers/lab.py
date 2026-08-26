from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import (
    Appointment, Doctor, LabOrder, LabOrderItem, LabResult, LabSample,
    LabTest, LabTestCategory, Patient, User,
)
from app.schemas.all_schemas import (
    LabOrderCreate, LabOrderResponse, LabResultCreate, LabResultResponse,
    LabResultUpdate, LabSampleCreate, LabSampleResponse, LabTestCategoryCreate,
    LabTestCategoryResponse, LabTestCreate, LabTestResponse,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(prefix="/lab", tags=["laboratory"])


def _scope_orders(query, current_user: User, db: Session):
    if current_user.role == UserRole.doctor.value:
        return query.filter(LabOrder.doctor_id == current_user.id)
    return query


def _sync_order_status(db: Session, order_id: int) -> None:
    order = db.get(LabOrder, order_id)
    if not order:
        return
    statuses = [row[0] for row in db.query(LabOrderItem.status).filter_by(order_id=order_id)]
    if statuses and all(status == "verified" for status in statuses):
        order.status = "completed"
    elif any(status not in ("ordered", "cancelled") for status in statuses):
        order.status = "in_progress"


@router.get("/dashboard")
def get_lab_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.laboratory_view)),
):
    return {
        "pending_orders": db.query(LabOrder).filter(LabOrder.status == "pending").count(),
        "unverified_results": db.query(LabResult).filter(LabResult.status == "completed").count(),
    }


@router.get("/categories", response_model=List[LabTestCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.laboratory_view)),
):
    return db.query(LabTestCategory).order_by(LabTestCategory.name).all()


@router.post("/categories", response_model=LabTestCategoryResponse, status_code=201)
def create_category(
    payload: LabTestCategoryCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_result)),
):
    item = LabTestCategory(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="laboratory.category_created",
        resource_type="lab_test_category", resource_id=str(item.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/tests", response_model=List[LabTestResponse])
def list_tests(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.laboratory_view)),
):
    return db.query(LabTest).order_by(LabTest.name).all()


@router.post("/tests", response_model=LabTestResponse, status_code=201)
def create_test(
    payload: LabTestCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_result)),
):
    if not db.get(LabTestCategory, payload.category_id):
        raise HTTPException(status_code=400, detail="Lab test category does not exist")
    if db.query(LabTest).filter(LabTest.code == payload.code).first():
        raise HTTPException(status_code=409, detail="Lab test code already exists")
    item = LabTest(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="laboratory.test_created", resource_type="lab_test",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/orders", response_model=LabOrderResponse, status_code=201)
def create_lab_order(
    payload: LabOrderCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_order)),
):
    if current_user.role != UserRole.doctor.value:
        raise HTTPException(status_code=403, detail="Only a doctor may place a laboratory order")
    patient = db.get(Patient, payload.patient_id)
    doctor = db.query(Doctor).filter_by(user_id=current_user.id).first()
    if not patient or not doctor:
        raise HTTPException(status_code=400, detail="Doctor or patient profile is missing")
    if payload.appointment_id:
        appointment = db.get(Appointment, payload.appointment_id)
        if not appointment or appointment.patient_id != patient.id or appointment.doctor_id != doctor.id:
            raise HTTPException(status_code=400, detail="Appointment is not assigned to this doctor and patient")
    tests = db.query(LabTest).filter(LabTest.id.in_(payload.test_ids), LabTest.status == "active").all()
    if len(tests) != len(payload.test_ids):
        raise HTTPException(status_code=400, detail="One or more lab tests are invalid or inactive")
    order = LabOrder(
        patient_id=patient.id, doctor_id=current_user.id,
        appointment_id=payload.appointment_id, status="pending",
    )
    db.add(order)
    db.flush()
    for test_id in payload.test_ids:
        db.add(LabOrderItem(order_id=order.id, test_id=test_id, status="ordered"))
    record_audit_event(
        db, actor=current_user, action="laboratory.order_created", resource_type="lab_order",
        resource_id=str(order.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders", response_model=List[LabOrderResponse])
def get_lab_orders(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_view)),
):
    query = _scope_orders(db.query(LabOrder), current_user, db)
    return query.order_by(LabOrder.ordered_at.desc()).all()


@router.get("/samples", response_model=List[LabSampleResponse])
def list_samples(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.laboratory_view)),
):
    return db.query(LabSample).order_by(LabSample.collected_at.desc()).limit(200).all()


@router.post("/samples", response_model=LabSampleResponse, status_code=201)
def record_sample(
    payload: LabSampleCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_sample)),
):
    order_item = db.get(LabOrderItem, payload.order_item_id)
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    existing = db.query(LabSample).filter_by(order_item_id=order_item.id).first()
    if existing:
        if existing.barcode == payload.barcode:
            return existing
        raise HTTPException(status_code=409, detail="A sample already exists for this order item")
    if order_item.status != "ordered":
        raise HTTPException(status_code=409, detail="Sample can only be collected for an ordered test")
    item = LabSample(
        **payload.model_dump(exclude={"status"}),
        collected_by=current_user.id,
        status="collected",
    )
    db.add(item)
    order_item.status = "sample_collected"
    _sync_order_status(db, order_item.order_id)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="laboratory.sample_collected", resource_type="lab_sample",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/results", response_model=List[LabResultResponse])
def list_results(
    verified_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_view)),
):
    query = db.query(LabResult).join(LabOrderItem, LabResult.order_item_id == LabOrderItem.id).join(
        LabOrder, LabOrderItem.order_id == LabOrder.id,
    )
    query = _scope_orders(query, current_user, db)
    if verified_only:
        query = query.filter(LabResult.status == "verified")
    return query.order_by(LabResult.created_at.desc()).limit(200).all()


@router.post("/results", response_model=LabResultResponse, status_code=201)
def enter_result(
    payload: LabResultCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_result)),
):
    order_item = db.get(LabOrderItem, payload.order_item_id)
    if not order_item:
        raise HTTPException(status_code=404, detail="Order item not found")
    existing = db.query(LabResult).filter_by(order_item_id=order_item.id).first()
    if existing:
        return existing
    if order_item.status not in ("sample_collected", "processing"):
        raise HTTPException(status_code=409, detail="Result requires a collected sample")
    item = LabResult(
        **payload.model_dump(exclude={"status"}), technician_id=current_user.id,
        status="completed",
    )
    db.add(item)
    order_item.status = "completed"
    _sync_order_status(db, order_item.order_id)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="laboratory.result_entered", resource_type="lab_result",
        resource_id=str(item.id), new_values=payload.model_dump(exclude={"status"}),
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/results/{result_id}", response_model=LabResultResponse)
def update_result(
    result_id: int, payload: LabResultUpdate, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_result)),
):
    item = db.get(LabResult, result_id)
    if not item:
        raise HTTPException(status_code=404, detail="Result not found")
    if item.status == "verified":
        raise HTTPException(status_code=409, detail="Verified lab results are immutable")
    if item.technician_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the entering technician may edit this result")
    changes = payload.model_dump(exclude_unset=True)
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    record_audit_event(
        db, actor=current_user, action="laboratory.result_updated", resource_type="lab_result",
        resource_id=str(item.id), old_values=old_values, new_values=changes,
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/results/{result_id}/verify", response_model=LabResultResponse)
def verify_result(
    result_id: int, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.laboratory_verify)),
):
    item = db.get(LabResult, result_id)
    if not item:
        raise HTTPException(status_code=404, detail="Result not found")
    if item.status == "verified":
        return item
    if item.technician_id == current_user.id:
        raise HTTPException(status_code=409, detail="A second technician must verify this result")
    item.status = "verified"
    item.verified_by = current_user.id
    item.verified_at = datetime.now(timezone.utc)
    order_item = db.get(LabOrderItem, item.order_item_id)
    order_item.status = "verified"
    _sync_order_status(db, order_item.order_id)
    record_audit_event(
        db, actor=current_user, action="laboratory.result_verified", resource_type="lab_result",
        resource_id=str(item.id), new_values={"status": "verified"},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item
