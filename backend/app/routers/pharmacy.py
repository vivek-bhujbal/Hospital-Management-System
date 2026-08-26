from datetime import date, timedelta
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.permissions import Permission
from app.database import get_db
from app.models.all_models import (
    Appointment, Dispensing, DispensingItem, Medicine, MedicineBatch,
    MedicineCategory, Patient, Prescription, Purchase, PurchaseItem,
    StockTransaction, Supplier, User,
)
from app.schemas.all_schemas import (
    DispenseRequest, DispensingResponse, MedicineBatchCreate, MedicineBatchResponse,
    MedicineCategoryCreate, MedicineCategoryResponse, MedicineCreate, MedicineResponse,
    PurchaseCreate, PurchaseResponse, SupplierCreate, SupplierResponse,
    PrescriptionResponse,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(prefix="/pharmacy", tags=["pharmacy"])


@router.get("/prescriptions", response_model=List[PrescriptionResponse])
def list_prescriptions_for_dispensing(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_view)),
):
    return db.query(Prescription).order_by(Prescription.created_at.desc()).all()


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
    current_user: User = Depends(require_permission(Permission.pharmacy_purchase)),
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
    db.flush()
    record_audit_event(
        db, actor=current_user, action="pharmacy.medicine_created", resource_type="medicine",
        resource_id=str(item.id), new_values=payload.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.get("/inventory", response_model=List[MedicineBatchResponse])
def get_inventory(
    include_empty: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.pharmacy_inventory)),
):
    query = db.query(MedicineBatch)
    if not include_empty:
        query = query.filter(MedicineBatch.available_quantity > 0)
    return query.order_by(MedicineBatch.expiry_date, MedicineBatch.id).all()


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
                reference_id=purchase.id, created_by=current_user.id,
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
        return existing
    prescription = db.get(Prescription, payload.prescription_id)
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
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
                created_by=current_user.id,
            ))
        dispensing.total_amount = total
        record_audit_event(
            db, actor=current_user, action="pharmacy.prescription_dispensed",
            resource_type="dispensing", resource_id=str(dispensing.id),
            new_values={"prescription_id": prescription.id, "total_amount": total},
            **request_audit_metadata(request),
        )
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except IntegrityError:
        db.rollback()
        existing = db.query(Dispensing).filter_by(prescription_id=payload.prescription_id).first()
        if existing:
            return existing
        raise HTTPException(status_code=409, detail="Prescription dispensing conflicted with another request")
    db.refresh(dispensing)
    return dispensing
