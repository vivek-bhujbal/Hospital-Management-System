from datetime import date, datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_exact_role, require_permission
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import (
    Appointment, Doctor, LabOrder, LabOrderItem, LabResult, LabSample,
    LabTest, LabTestCategory, Patient, User,
)
from app.schemas.all_schemas import (
    LabOrderCreate, LabOrderResponse, LabResultCreate, LabResultUpdate,
    LabSampleCreate, LabTestCategoryCreate, LabTestCategoryResponse,
    LabTestCreate, LabTestResponse,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(prefix="/lab", tags=["laboratory"])
lab_technician = require_exact_role(UserRole.lab_technician)
doctor_only = require_exact_role(UserRole.doctor)


def _authorized_order(db: Session, order_id: int, technician: User, *, lock: bool = False) -> LabOrder:
    query = db.query(LabOrder).filter(LabOrder.id == order_id)
    if lock:
        query = query.with_for_update()
    order = query.first()
    if not order:
        raise HTTPException(status_code=404, detail="Laboratory order not found")
    if order.assigned_technician_id not in (None, technician.id):
        raise HTTPException(status_code=403, detail="Laboratory order is assigned to another technician")
    return order


def _authorized_item(db: Session, item_id: int, technician: User, *, lock: bool = False):
    query = db.query(LabOrderItem).filter(LabOrderItem.id == item_id)
    if lock:
        query = query.with_for_update()
    item = query.first()
    if not item:
        raise HTTPException(status_code=404, detail="Laboratory order item not found")
    order = _authorized_order(db, item.order_id, technician, lock=lock)
    if order.assigned_technician_id != technician.id:
        raise HTTPException(status_code=409, detail="Accept the laboratory order before processing tests")
    return order, item


def _sync_order_status(db: Session, order_id: int) -> None:
    order = db.get(LabOrder, order_id)
    statuses = [row[0] for row in db.query(LabOrderItem.status).filter_by(order_id=order_id).all()]
    if not order or not statuses:
        return
    active = [status for status in statuses if status != "cancelled"]
    if not active:
        order.status = "cancelled"
    elif all(status == "completed" for status in active):
        order.status = "completed"
    elif any(status in ("processing", "completed") for status in active):
        order.status = "processing"
    elif any(status == "sample_collected" for status in active):
        order.status = "sample_collected"
    else:
        order.status = "ordered"


def _order_record(db: Session, order: LabOrder):
    patient = db.get(Patient, order.patient_id)
    doctor_user = db.get(User, order.doctor_id)
    doctor = db.query(Doctor).filter(Doctor.user_id == order.doctor_id).first()
    items = []
    for item in db.query(LabOrderItem).filter_by(order_id=order.id).order_by(LabOrderItem.id).all():
        test = db.get(LabTest, item.test_id)
        sample = db.query(LabSample).filter_by(order_item_id=item.id).first()
        result = db.query(LabResult).filter_by(order_item_id=item.id).first()
        items.append({
            "id": item.id,
            "test_id": item.test_id,
            "test_name": test.name if test else "Unknown test",
            "test_code": test.code if test else None,
            "status": item.status,
            "sample": {
                "id": sample.id, "sample_type": sample.sample_type,
                "barcode": sample.barcode, "collected_by": sample.collected_by,
                "collected_at": sample.collected_at,
            } if sample else None,
            "result": _result_record(db, result) if result else None,
        })
    return {
        "id": order.id, "patient_id": order.patient_id,
        "patient_name": patient.name if patient else "Unknown patient",
        "patient_age": patient.age if patient else None,
        "patient_gender": patient.gender if patient else None,
        "patient_contact": patient.contact if patient else None,
        "doctor_id": order.doctor_id,
        "doctor_name": doctor.name if doctor else (doctor_user.name if doctor_user else "Unknown doctor"),
        "appointment_id": order.appointment_id,
        "assigned_technician_id": order.assigned_technician_id,
        "instructions": order.instructions, "priority": order.priority,
        "status": order.status, "accepted_at": order.accepted_at,
        "ordered_at": order.ordered_at, "items": items,
    }


def _result_record(db: Session, result: LabResult):
    item = db.get(LabOrderItem, result.order_item_id)
    order = db.get(LabOrder, item.order_id) if item else None
    patient = db.get(Patient, order.patient_id) if order else None
    test = db.get(LabTest, item.test_id) if item else None
    technician = db.get(User, result.technician_id)
    return {
        "id": result.id, "order_item_id": result.order_item_id,
        "order_id": order.id if order else None,
        "patient_id": patient.id if patient else None,
        "patient_name": patient.name if patient else "Unknown patient",
        "test_id": test.id if test else None,
        "test_name": test.name if test else "Unknown test",
        "technician_id": result.technician_id,
        "technician_name": technician.name if technician else "Unknown technician",
        "result_value": result.result_value, "numeric_value": result.numeric_value,
        "unit": result.unit, "reference_range": result.reference_range,
        "remarks": result.remarks, "status": result.status,
        "created_at": result.created_at, "updated_at": result.updated_at,
        "finalized_at": result.finalized_at,
    }


@router.get("/dashboard")
def get_lab_dashboard(
    db: Session = Depends(get_db),
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_view)),
):
    visible = or_(LabOrder.assigned_technician_id.is_(None), LabOrder.assigned_technician_id == technician.id)
    item_base = db.query(LabOrderItem).join(LabOrder).filter(visible)
    today = date.today()
    return {
        "pending_lab_orders": db.query(LabOrder).filter(visible, LabOrder.status == "ordered").count(),
        "samples_collected": item_base.filter(LabOrderItem.status == "sample_collected").count(),
        "tests_in_progress": item_base.filter(LabOrderItem.status == "processing").count(),
        "completed_tests": item_base.filter(LabOrderItem.status == "completed").count(),
        "urgent_tests": item_base.filter(
            LabOrder.priority.in_(("urgent", "stat")),
            LabOrderItem.status.notin_(("completed", "cancelled")),
        ).count(),
        "today_workload": db.query(LabOrderItem).join(LabOrder).filter(
            visible, func.date(LabOrder.ordered_at) == today,
            LabOrderItem.status != "cancelled",
        ).count(),
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
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_result)),
):
    item = LabTestCategory(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=technician, action="laboratory.category_created",
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
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_result)),
):
    if not db.get(LabTestCategory, payload.category_id):
        raise HTTPException(status_code=400, detail="Lab test category does not exist")
    if db.query(LabTest).filter(LabTest.code == payload.code).first():
        raise HTTPException(status_code=409, detail="Lab test code already exists")
    item = LabTest(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=technician, action="laboratory.test_created", resource_type="lab_test",
        resource_id=str(item.id), new_values=payload.model_dump(),
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.post("/orders", response_model=LabOrderResponse, status_code=201)
def create_lab_order(
    payload: LabOrderCreate, request: Request, db: Session = Depends(get_db),
    doctor_user: User = Depends(doctor_only),
    _: User = Depends(require_permission(Permission.laboratory_order)),
):
    patient = db.get(Patient, payload.patient_id)
    doctor = db.query(Doctor).filter_by(user_id=doctor_user.id).first()
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
        patient_id=patient.id, doctor_id=doctor_user.id,
        appointment_id=payload.appointment_id, instructions=payload.instructions,
        priority=payload.priority, status="ordered",
    )
    db.add(order)
    db.flush()
    for test_id in payload.test_ids:
        db.add(LabOrderItem(order_id=order.id, test_id=test_id, status="ordered"))
    record_audit_event(
        db, actor=doctor_user, action="laboratory.order_created", resource_type="lab_order",
        resource_id=str(order.id), new_values=payload.model_dump(),
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(order)
    return order


@router.get("/orders")
def get_lab_orders(
    db: Session = Depends(get_db),
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_view)),
):
    orders = db.query(LabOrder).filter(or_(
        LabOrder.assigned_technician_id.is_(None),
        LabOrder.assigned_technician_id == technician.id,
    )).order_by(LabOrder.ordered_at.desc()).all()
    return [_order_record(db, order) for order in orders]


@router.get("/orders/{order_id}")
def get_lab_order(
    order_id: int, db: Session = Depends(get_db),
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_view)),
):
    return _order_record(db, _authorized_order(db, order_id, technician))


@router.post("/orders/{order_id}/accept")
def accept_lab_order(
    order_id: int, request: Request, db: Session = Depends(get_db),
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_sample)),
):
    order = _authorized_order(db, order_id, technician, lock=True)
    if order.status in ("completed", "cancelled"):
        raise HTTPException(status_code=409, detail=f"A {order.status} order cannot be accepted")
    if order.assigned_technician_id == technician.id:
        raise HTTPException(status_code=409, detail="Laboratory order is already accepted by you")
    order.assigned_technician_id = technician.id
    order.accepted_at = datetime.now(timezone.utc)
    record_audit_event(
        db, actor=technician, action="laboratory.order_accepted", resource_type="lab_order",
        resource_id=str(order.id), new_values={"assigned_technician_id": technician.id},
        **request_audit_metadata(request),
    )
    db.commit()
    return _order_record(db, order)


@router.post("/order-items/{item_id}/sample")
def record_sample(
    item_id: int, payload: LabSampleCreate, request: Request,
    db: Session = Depends(get_db), technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_sample)),
):
    order, item = _authorized_item(db, item_id, technician, lock=True)
    if payload.order_item_id != item.id:
        raise HTTPException(status_code=400, detail="Sample order item does not match URL")
    if item.status != "ordered":
        raise HTTPException(status_code=409, detail="Sample collection requires an ordered test")
    if db.query(LabSample).filter_by(order_item_id=item.id).first():
        raise HTTPException(status_code=409, detail="A sample already exists for this test")
    sample = LabSample(
        order_item_id=item.id, sample_type=payload.sample_type,
        barcode=payload.barcode, collected_by=technician.id, status="collected",
    )
    db.add(sample)
    item.status = "sample_collected"
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Sample barcode or order item already exists")
    _sync_order_status(db, order.id)
    record_audit_event(
        db, actor=technician, action="laboratory.sample_collected", resource_type="lab_sample",
        resource_id=str(sample.id), new_values={
            "order_id": order.id, "order_item_id": item.id,
            "sample_type": sample.sample_type, "barcode": sample.barcode,
        }, **request_audit_metadata(request),
    )
    db.commit()
    return _order_record(db, order)


@router.post("/order-items/{item_id}/start")
def start_processing(
    item_id: int, request: Request, db: Session = Depends(get_db),
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_sample)),
):
    order, item = _authorized_item(db, item_id, technician, lock=True)
    if item.status != "sample_collected":
        raise HTTPException(status_code=409, detail="Processing requires a collected sample")
    item.status = "processing"
    sample = db.query(LabSample).filter_by(order_item_id=item.id).first()
    if sample:
        sample.status = "processing"
    db.flush()
    _sync_order_status(db, order.id)
    record_audit_event(
        db, actor=technician, action="laboratory.processing_started",
        resource_type="lab_order_item", resource_id=str(item.id),
        new_values={"order_id": order.id, "status": "processing"},
        **request_audit_metadata(request),
    )
    db.commit()
    return _order_record(db, order)


@router.get("/results")
def list_results(
    db: Session = Depends(get_db), technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_view)),
):
    results = db.query(LabResult).join(LabOrderItem).join(LabOrder).filter(
        LabOrder.assigned_technician_id == technician.id,
    ).order_by(LabResult.created_at.desc()).limit(200).all()
    return [_result_record(db, result) for result in results]


@router.post("/results", status_code=201)
def enter_result(
    payload: LabResultCreate, request: Request, db: Session = Depends(get_db),
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_result)),
):
    order, item = _authorized_item(db, payload.order_item_id, technician, lock=True)
    if item.status != "processing":
        raise HTTPException(status_code=409, detail="Result entry requires a test in processing")
    if db.query(LabResult).filter_by(order_item_id=item.id).first():
        raise HTTPException(status_code=409, detail="A result already exists for this test")
    if not (payload.result_value or "").strip() and payload.numeric_value is None:
        raise HTTPException(status_code=422, detail="A text or numeric test result is required")
    result = LabResult(
        **payload.model_dump(exclude={"status"}), technician_id=technician.id, status="draft",
    )
    db.add(result)
    db.flush()
    record_audit_event(
        db, actor=technician, action="laboratory.result_entered", resource_type="lab_result",
        resource_id=str(result.id), new_values={
            **payload.model_dump(exclude={"status"}), "order_id": order.id,
            "patient_id": order.patient_id, "test_id": item.test_id, "status": "draft",
        }, **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(result)
    return _result_record(db, result)


@router.put("/results/{result_id}")
def update_result(
    result_id: int, payload: LabResultUpdate, request: Request,
    db: Session = Depends(get_db), technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_result)),
):
    result = db.query(LabResult).filter(LabResult.id == result_id).with_for_update().first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    order, _item = _authorized_item(db, result.order_item_id, technician)
    if result.technician_id != technician.id:
        raise HTTPException(status_code=403, detail="Only the entering technician may edit this draft")
    if result.status == "finalized":
        raise HTTPException(status_code=409, detail="Finalized laboratory results are immutable")
    changes = payload.model_dump(exclude_unset=True)
    if "result_value" in changes and changes["result_value"] is not None:
        changes["result_value"] = changes["result_value"].strip()
    old_values = {key: getattr(result, key) for key in changes}
    for key, value in changes.items():
        setattr(result, key, value)
    if not (result.result_value or "").strip() and result.numeric_value is None:
        raise HTTPException(status_code=422, detail="A text or numeric test result is required")
    record_audit_event(
        db, actor=technician, action="laboratory.result_updated", resource_type="lab_result",
        resource_id=str(result.id), old_values=old_values,
        new_values={**changes, "order_id": order.id}, **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(result)
    return _result_record(db, result)


@router.post("/results/{result_id}/finalize")
def finalize_result(
    result_id: int, request: Request, db: Session = Depends(get_db),
    technician: User = Depends(lab_technician),
    _: User = Depends(require_permission(Permission.laboratory_result)),
):
    result = db.query(LabResult).filter(LabResult.id == result_id).with_for_update().first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    order, item = _authorized_item(db, result.order_item_id, technician, lock=True)
    if result.technician_id != technician.id:
        raise HTTPException(status_code=403, detail="Only the entering technician may finalize this result")
    if result.status == "finalized":
        raise HTTPException(status_code=409, detail="Laboratory result is already finalized")
    if not (result.result_value or "").strip() and result.numeric_value is None:
        raise HTTPException(status_code=422, detail="A final result value is required")
    result.status = "finalized"
    result.finalized_at = datetime.now(timezone.utc)
    item.status = "completed"
    sample = db.query(LabSample).filter_by(order_item_id=item.id).first()
    if sample:
        sample.status = "completed"
    db.flush()
    _sync_order_status(db, order.id)
    record_audit_event(
        db, actor=technician, action="laboratory.result_finalized", resource_type="lab_result",
        resource_id=str(result.id), old_values={"status": "draft"},
        new_values={
            "status": "finalized", "order_id": order.id,
            "patient_id": order.patient_id, "test_id": item.test_id,
            "technician_id": technician.id, "finalized_at": result.finalized_at,
        }, **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(result)
    return _result_record(db, result)
