from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_exact_role, require_permission
from app.core.permissions import Permission
from app.database import get_db
from app.models.all_models import (
    Appointment, Dispensing, DispensingItem, Doctor, Medicine, MedicineBatch,
    MedicineCategory, Patient, PharmacyPrescriptionReview, Prescription,
    Purchase, PurchaseItem, StockTransaction, Supplier, User,
)
from app.schemas.all_schemas import (
    DispenseRequest, DispensingResponse, InventoryAdjustmentRequest,
    InventoryBatchCreate, MedicineBatchCreate, MedicineBatchResponse,
    MedicineCategoryCreate, MedicineCategoryResponse, MedicineCreate, MedicineResponse,
    PharmacyPrescriptionAction, PurchaseCreate, PurchaseResponse,
    SupplierCreate, SupplierResponse,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(
    prefix="/pharmacy",
    tags=["pharmacy"],
    dependencies=[Depends(require_exact_role("pharmacist"))],
)


def _prescription_record(row):
    prescription, appointment, patient, doctor, review, dispensing = row
    return {
        "id": prescription.id,
        "appointment_id": appointment.id,
        "patient_id": patient.id,
        "patient_name": patient.name,
        "doctor_id": doctor.id,
        "doctor_name": doctor.name,
        "diagnosis": prescription.diagnosis,
        "medicine": prescription.medicine,
        "dosage": prescription.dosage,
        "instructions": prescription.notes,
        "prescription_date": prescription.created_at,
        "appointment_date": appointment.appt_date,
        "appointment_status": appointment.status,
        "pharmacy_status": review.status if review else "pending",
        "rejection_reason": review.rejection_reason if review else None,
        "dispensing_id": dispensing.id if dispensing else None,
    }


def _prescription_query(db: Session):
    return db.query(
        Prescription, Appointment, Patient, Doctor,
        PharmacyPrescriptionReview, Dispensing,
    ).join(
        Appointment, Appointment.id == Prescription.appointment_id,
    ).join(
        Patient, Patient.id == Appointment.patient_id,
    ).join(
        Doctor, Doctor.id == Appointment.doctor_id,
    ).outerjoin(
        PharmacyPrescriptionReview,
        PharmacyPrescriptionReview.prescription_id == Prescription.id,
    ).outerjoin(
        Dispensing, Dispensing.prescription_id == Prescription.id,
    )


@router.get("/prescriptions")
def list_prescriptions_for_dispensing(
    search: str = Query(default="", max_length=100),
    status: str = Query(default="", max_length=30),
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_view)),
):
    query = _prescription_query(db)
    if search.strip():
        value = f"%{search.strip()}%"
        query = query.filter(or_(
            Patient.name.ilike(value), Doctor.name.ilike(value),
            Prescription.medicine.ilike(value),
        ))
    rows = query.order_by(Prescription.created_at.desc()).all()
    records = [_prescription_record(row) for row in rows]
    if status:
        records = [record for record in records if record["pharmacy_status"] == status]
    return records


@router.get("/prescriptions/{prescription_id}")
def get_prescription_for_dispensing(
    prescription_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_view)),
):
    row = _prescription_query(db).filter(Prescription.id == prescription_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return _prescription_record(row)


@router.post("/prescriptions/{prescription_id}/action")
def update_prescription_workflow(
    prescription_id: int, payload: PharmacyPrescriptionAction, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.pharmacy_dispense)),
):
    if not db.get(Prescription, prescription_id):
        raise HTTPException(status_code=404, detail="Prescription not found")
    review = db.query(PharmacyPrescriptionReview).filter_by(
        prescription_id=prescription_id
    ).with_for_update().first()
    current_status = review.status if review else "pending"
    transitions = {
        "pending": {"verify": "verified", "reject": "rejected"},
        "verified": {"mark_for_dispensing": "ready_for_dispensing", "reject": "rejected"},
    }
    next_status = transitions.get(current_status, {}).get(payload.action)
    if not next_status:
        raise HTTPException(
            status_code=409,
            detail=f"Action {payload.action} is not allowed while prescription is {current_status}",
        )
    if review is None:
        review = PharmacyPrescriptionReview(
            prescription_id=prescription_id,
            status=next_status,
            updated_by=current_user.id,
        )
        db.add(review)
    review.status = next_status
    review.updated_by = current_user.id
    review.rejection_reason = payload.reason.strip() if payload.reason else None
    if next_status == "verified":
        review.verified_by = current_user.id
        review.verified_at = datetime.now()
    record_audit_event(
        db, actor=current_user, action=f"pharmacy.prescription_{next_status}",
        resource_type="prescription", resource_id=str(prescription_id),
        old_values={"pharmacy_status": current_status},
        new_values={"pharmacy_status": next_status, "reason": review.rejection_reason},
        **request_audit_metadata(request),
    )
    db.commit()
    return get_prescription_for_dispensing(prescription_id, db, current_user)


@router.get("/dashboard")
def pharmacy_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_view)),
):
    records = [_prescription_record(row) for row in _prescription_query(db).all()]
    today = date.today()
    batches = db.query(MedicineBatch).all()
    low_stock = sum(1 for item in batches if 0 < item.available_quantity <= 10 and item.expiry_date >= today)
    out_of_stock = sum(1 for item in batches if item.available_quantity == 0)
    expired = sum(1 for item in batches if item.available_quantity > 0 and item.expiry_date < today)
    dispensed_today = db.query(Dispensing).filter(
        func.date(Dispensing.dispensed_at) == today
    ).count()
    return {
        "pending_prescriptions": sum(record["pharmacy_status"] == "pending" for record in records),
        "ready_for_dispensing": sum(record["pharmacy_status"] == "ready_for_dispensing" for record in records),
        "low_stock_medicines": low_stock,
        "out_of_stock_medicines": out_of_stock,
        "today_dispensed_medicines": dispensed_today,
        "alerts": {
            "expired_batches": expired,
            "rejected_prescriptions": sum(record["pharmacy_status"] == "rejected" for record in records),
        },
        "recent_prescriptions": records[:8],
    }


@router.get("/categories", response_model=List[MedicineCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_view)),
):
    return db.query(MedicineCategory).order_by(MedicineCategory.name).all()


@router.post("/categories", response_model=MedicineCategoryResponse, status_code=201)
def create_category(
    payload: MedicineCategoryCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.pharmacy_inventory)),
):
    item = MedicineCategory(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="pharmacy.category_created",
        resource_type="medicine_category", resource_id=str(item.id),
        new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_view)),
):
    return db.query(Supplier).order_by(Supplier.name).all()


@router.post("/suppliers", response_model=SupplierResponse, status_code=201)
def create_supplier(
    payload: SupplierCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.pharmacy_inventory)),
):
    item = Supplier(**payload.model_dump())
    db.add(item)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="pharmacy.supplier_created", resource_type="supplier",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/medicines", response_model=List[MedicineResponse])
def get_medicines(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_view)),
):
    return db.query(Medicine).order_by(Medicine.name).all()


@router.post("/medicines", response_model=MedicineResponse, status_code=201)
def create_medicine(
    payload: MedicineCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.pharmacy_inventory)),
):
    if not db.get(MedicineCategory, payload.category_id):
        raise HTTPException(status_code=400, detail="Medicine category does not exist")
    item = Medicine(**payload.model_dump())
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Medicine SKU/code already exists")
    record_audit_event(
        db, actor=current_user, action="pharmacy.medicine_created", resource_type="medicine",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


def _batch_record(db: Session, batch: MedicineBatch):
    medicine = db.get(Medicine, batch.medicine_id)
    supplier = db.get(Supplier, batch.supplier_id) if batch.supplier_id else None
    today = date.today()
    if batch.expiry_date < today and batch.available_quantity > 0:
        stock_status = "expired"
    elif batch.available_quantity == 0:
        stock_status = "out_of_stock"
    elif batch.available_quantity <= 10:
        stock_status = "low_stock"
    else:
        stock_status = "in_stock"
    return {
        "id": batch.id, "medicine_id": batch.medicine_id,
        "medicine_name": medicine.name if medicine else "Unknown medicine",
        "sku": medicine.sku if medicine else None,
        "supplier_id": batch.supplier_id,
        "supplier_name": supplier.name if supplier else None,
        "batch_number": batch.batch_number, "expiry_date": batch.expiry_date,
        "purchase_price": batch.purchase_price, "selling_price": batch.selling_price,
        "quantity": batch.quantity, "available_quantity": batch.available_quantity,
        "stock_status": stock_status, "created_at": batch.created_at,
    }


@router.get("/inventory")
def get_inventory(
    include_empty: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_inventory)),
):
    query = db.query(MedicineBatch)
    if not include_empty:
        query = query.filter(MedicineBatch.available_quantity > 0)
    return [
        _batch_record(db, batch)
        for batch in query.order_by(MedicineBatch.expiry_date, MedicineBatch.id).all()
    ]


@router.post("/inventory", status_code=201)
def add_inventory_batch(
    payload: InventoryBatchCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.pharmacy_inventory)),
):
    medicine = db.get(Medicine, payload.medicine_id)
    if not medicine or medicine.status != "active":
        raise HTTPException(status_code=400, detail="Medicine does not exist or is inactive")
    if payload.supplier_id and not db.get(Supplier, payload.supplier_id):
        raise HTTPException(status_code=400, detail="Supplier does not exist")
    if payload.expiry_date <= date.today():
        raise HTTPException(status_code=400, detail="Expired stock cannot be added")
    batch = MedicineBatch(
        **payload.model_dump(), available_quantity=payload.quantity,
    )
    db.add(batch)
    try:
        db.flush()
        db.add(StockTransaction(
            medicine_id=batch.medicine_id, batch_id=batch.id,
            transaction_type="adjustment", quantity=payload.quantity,
            reason="Initial stock", created_by=current_user.id,
        ))
        record_audit_event(
            db, actor=current_user, action="pharmacy.stock_added",
            resource_type="medicine_batch", resource_id=str(batch.id),
            new_values={
                "prescription_id": None, "medicine_id": batch.medicine_id,
                "batch": batch.batch_number, "quantity": payload.quantity,
            }, **request_audit_metadata(request),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This batch already exists for the medicine")
    db.refresh(batch)
    return _batch_record(db, batch)


@router.post("/inventory/{batch_id}/adjust")
def adjust_inventory_batch(
    batch_id: int, payload: InventoryAdjustmentRequest, request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.pharmacy_inventory)),
):
    batch = db.query(MedicineBatch).filter(MedicineBatch.id == batch_id).with_for_update().first()
    if not batch:
        raise HTTPException(status_code=404, detail="Inventory batch not found")
    old_available = batch.available_quantity
    if payload.action == "add_stock":
        if batch.expiry_date <= date.today():
            raise HTTPException(status_code=400, detail="Cannot add expired stock")
        batch.quantity += payload.quantity
        batch.available_quantity += payload.quantity
    elif payload.action == "update_stock":
        # A counted quantity is supplied; both increase and decrease remain auditable.
        counted_quantity = payload.quantity
        if counted_quantity > batch.quantity:
            batch.quantity = counted_quantity
        batch.available_quantity = counted_quantity
    else:
        if payload.quantity > batch.available_quantity:
            raise HTTPException(status_code=409, detail="Adjustment exceeds available stock")
        batch.available_quantity -= payload.quantity
    delta = abs(batch.available_quantity - old_available)
    if delta == 0:
        raise HTTPException(status_code=409, detail="Stock quantity is unchanged")
    reason = payload.reason or payload.action.replace("_", " ")
    db.add(StockTransaction(
        medicine_id=batch.medicine_id, batch_id=batch.id,
        transaction_type="adjustment", quantity=delta, reason=reason,
        created_by=current_user.id,
    ))
    record_audit_event(
        db, actor=current_user, action=f"pharmacy.stock_{payload.action}",
        resource_type="medicine_batch", resource_id=str(batch.id),
        old_values={"available_quantity": old_available},
        new_values={
            "prescription_id": None, "medicine_id": batch.medicine_id,
            "batch": batch.batch_number, "quantity": delta,
            "available_quantity": batch.available_quantity, "reason": reason,
        }, **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(batch)
    return _batch_record(db, batch)


@router.get("/alerts")
def get_alerts(
    low_stock_threshold: int = 10,
    expiry_days: int = 30,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_inventory)),
):
    if not 1 <= low_stock_threshold <= 10000 or not 0 <= expiry_days <= 3650:
        raise HTTPException(status_code=422, detail="Invalid alert threshold")
    today = date.today()
    cutoff = today + timedelta(days=expiry_days)
    low_stock = db.query(MedicineBatch).filter(
        MedicineBatch.available_quantity > 0,
        MedicineBatch.available_quantity <= low_stock_threshold,
    ).all()
    expiring = db.query(MedicineBatch).filter(
        MedicineBatch.available_quantity > 0,
        MedicineBatch.expiry_date >= today,
        MedicineBatch.expiry_date <= cutoff,
    ).all()
    expired = db.query(MedicineBatch).filter(
        MedicineBatch.available_quantity > 0,
        MedicineBatch.expiry_date < today,
    ).all()
    serialize = lambda batch: {
        "batch_id": batch.id, "medicine_id": batch.medicine_id,
        "available_quantity": batch.available_quantity,
        "expiry_date": batch.expiry_date,
    }
    return {
        "low_stock": [serialize(item) for item in low_stock],
        "expiring": [serialize(item) for item in expiring],
        "expired": [serialize(item) for item in expired],
    }


@router.get("/purchases", response_model=List[PurchaseResponse])
def list_purchases(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_purchase)),
):
    return db.query(Purchase).order_by(Purchase.purchase_date.desc(), Purchase.id.desc()).all()


@router.post("/purchases", response_model=PurchaseResponse, status_code=201)
def receive_purchase(
    payload: PurchaseCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.pharmacy_purchase)),
):
    if not db.get(Supplier, payload.supplier_id):
        raise HTTPException(status_code=400, detail="Supplier does not exist")
    if any(item.expiry_date <= payload.purchase_date for item in payload.items):
        raise HTTPException(status_code=400, detail="Batch expiry must be after purchase date")
    total = sum((item.purchase_price * item.quantity for item in payload.items), Decimal("0.00"))
    purchase = Purchase(
        supplier_id=payload.supplier_id, purchase_date=payload.purchase_date,
        total_amount=total, status="received", created_by=current_user.id,
    )
    db.add(purchase)
    db.flush()
    try:
        for item in payload.items:
            medicine = db.get(Medicine, item.medicine_id)
            if not medicine or medicine.status != "active":
                raise HTTPException(status_code=400, detail=f"Medicine {item.medicine_id} is invalid or inactive")
            batch = MedicineBatch(
                medicine_id=item.medicine_id, batch_number=item.batch_number,
                supplier_id=payload.supplier_id,
                expiry_date=item.expiry_date, purchase_price=item.purchase_price,
                selling_price=item.selling_price, quantity=item.quantity,
                available_quantity=item.quantity,
            )
            db.add(batch)
            db.flush()
            db.add(PurchaseItem(purchase_id=purchase.id, **item.model_dump()))
            db.add(StockTransaction(
                medicine_id=item.medicine_id, batch_id=batch.id,
                transaction_type="purchase", quantity=item.quantity,
                reference_id=purchase.id, reason="Supplier purchase received",
                created_by=current_user.id,
            ))
        record_audit_event(
            db, actor=current_user, action="pharmacy.purchase_received", resource_type="purchase",
            resource_id=str(purchase.id),
            new_values={"supplier_id": payload.supplier_id, "total_amount": total, "item_count": len(payload.items)},
            **request_audit_metadata(request),
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A medicine batch with this number already exists")
    db.refresh(purchase)
    return purchase


@router.get("/dispensings", response_model=List[DispensingResponse])
def list_dispensings(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_view)),
):
    return db.query(Dispensing).order_by(Dispensing.dispensed_at.desc()).limit(200).all()


@router.post("/dispense", response_model=DispensingResponse, status_code=201)
def dispense_prescription(
    payload: DispenseRequest, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.pharmacy_dispense)),
):
    existing = db.query(Dispensing).filter_by(prescription_id=payload.prescription_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Prescription has already been fully dispensed")
    prescription = db.get(Prescription, payload.prescription_id)
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    if not (prescription.medicine or "").strip() or not (prescription.dosage or "").strip():
        raise HTTPException(status_code=400, detail="Prescription is incomplete or invalid")
    review = db.query(PharmacyPrescriptionReview).filter_by(
        prescription_id=payload.prescription_id
    ).with_for_update().first()
    if not review or review.status != "ready_for_dispensing":
        raise HTTPException(
            status_code=409,
            detail="Prescription must be verified and marked for dispensing first",
        )
    appointment = db.get(Appointment, prescription.appointment_id)
    if not appointment:
        raise HTTPException(status_code=409, detail="Prescription appointment is missing")

    dispensing = Dispensing(
        prescription_id=prescription.id, patient_id=appointment.patient_id,
        total_amount=Decimal("0.00"), status="completed", dispensed_by=current_user.id,
    )
    db.add(dispensing)
    db.flush()
    total = Decimal("0.00")
    try:
        for requested in payload.items:
            batch = db.query(MedicineBatch).filter(MedicineBatch.id == requested.batch_id).with_for_update().first()
            medicine = db.get(Medicine, requested.medicine_id)
            if not batch or not medicine:
                raise HTTPException(status_code=404, detail="Medicine or batch not found")
            if medicine.status != "active":
                raise HTTPException(status_code=400, detail="Inactive medicine cannot be dispensed")
            prescribed_name = (prescription.medicine or "").strip().casefold()
            valid_names = {medicine.name.strip().casefold(), (medicine.generic_name or "").strip().casefold()}
            if prescribed_name not in valid_names:
                raise HTTPException(status_code=400, detail="Selected medicine does not match the prescription")
            if batch.medicine_id != medicine.id:
                raise HTTPException(status_code=400, detail="Batch does not match selected medicine")
            if batch.expiry_date < date.today():
                raise HTTPException(status_code=400, detail="Expired medicine cannot be dispensed")
            if batch.available_quantity < requested.quantity:
                raise HTTPException(status_code=409, detail="Insufficient stock")
            batch.available_quantity -= requested.quantity
            line_total = batch.selling_price * requested.quantity
            total += line_total
            db.add(DispensingItem(
                dispensing_id=dispensing.id, medicine_id=medicine.id, batch_id=batch.id,
                quantity=requested.quantity, selling_price=batch.selling_price,
                total_price=line_total,
            ))
            db.add(StockTransaction(
                medicine_id=medicine.id, batch_id=batch.id, transaction_type="dispense",
                quantity=requested.quantity, reference_id=dispensing.id,
                reason=f"Prescription #{prescription.id}",
                created_by=current_user.id,
            ))
        dispensing.total_amount = total
        review.status = "dispensed"
        review.updated_by = current_user.id
        record_audit_event(
            db, actor=current_user, action="pharmacy.prescription_dispensed",
            resource_type="dispensing", resource_id=str(dispensing.id),
            new_values={
                "prescription_id": prescription.id,
                "pharmacist_id": current_user.id,
                "time": datetime.now(),
                "total_amount": total,
                "items": [
                    {
                        "medicine_id": item.medicine_id,
                        "batch_id": item.batch_id,
                        "quantity": item.quantity,
                    }
                    for item in payload.items
                ],
            },
            **request_audit_metadata(request),
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Prescription dispensing conflicted with another request")
    db.refresh(dispensing)
    return dispensing
