from datetime import date

from fastapi import HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.all_models import (
    Medicine,
    MedicineBatch,
    MedicineCategory,
    StockTransaction,
    Supplier,
    User,
)
from app.schemas.all_schemas import InventoryBatchCreate
from app.services.audit_service import record_audit_event, request_audit_metadata


def receive_stock(db: Session, payload: InventoryBatchCreate, actor: User, request: Request) -> MedicineBatch:
    medicine = db.get(Medicine, payload.medicine_id)
    if not medicine or medicine.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Selected medicine is inactive and cannot be received.",
        )
    category = db.get(MedicineCategory, medicine.category_id)
    if not category or category.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Selected medicine belongs to an inactive category and cannot be received.",
        )
    supplier = db.get(Supplier, payload.supplier_id)
    if not supplier or supplier.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Selected supplier is inactive and cannot be used for new stock receipt.",
        )
    if payload.expiry_date <= date.today():
        raise HTTPException(status_code=400, detail="Expiry date must be in the future.")
    batch = MedicineBatch(
        **payload.model_dump(), available_quantity=payload.quantity,
    )
    db.add(batch)
    try:
        db.flush()
        db.add(StockTransaction(
            medicine_id=batch.medicine_id, batch_id=batch.id,
            transaction_type="purchase", quantity=payload.quantity,
            reason="Stock received", created_by=actor.id,
        ))
        record_audit_event(
            db, actor=actor, action="pharmacy.stock_added",
            resource_type="medicine_batch", resource_id=str(batch.id),
            new_values={
                "prescription_id": None, "medicine_id": batch.medicine_id,
                "batch": batch.batch_number, "quantity": payload.quantity,
            }, **request_audit_metadata(request),
        )
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="This medicine batch already exists.")
    db.refresh(batch)
    return batch
