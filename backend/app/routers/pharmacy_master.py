from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_permission, require_role
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import Doctor, Medicine, MedicineCategory, Supplier, User
from app.schemas.all_schemas import (
    InventoryBatchCreate,
    MedicineCategoryCreate,
    MedicineCategoryResponse,
    MedicineCategoryUpdate,
    MedicineCreate,
    MedicineResponse,
    MedicineUpdate,
    SupplierCreate,
    SupplierResponse,
    SupplierUpdate,
)
from app.services.audit_service import record_audit_event, request_audit_metadata
from app.services.pharmacy_stock_service import receive_stock


router = APIRouter(
    prefix="/admin/pharmacy",
    tags=["admin pharmacy master"],
    dependencies=[
        Depends(require_role(UserRole.admin)),
        Depends(require_permission(Permission.pharmacy_master_manage)),
    ],
)


@router.get("/specializations", response_model=List[str])
def list_specializations(db: Session = Depends(get_db)):
    return sorted({row[0].strip() for row in db.query(Doctor.specialization).distinct().all() if row[0] and row[0].strip()})


@router.post("/inventory", status_code=201)
def receive_admin_stock(
    payload: InventoryBatchCreate, request: Request, db: Session = Depends(get_db),
    actor: User = Depends(require_permission(Permission.pharmacy_master_manage)),
):
    batch = receive_stock(db, payload, actor, request)
    return {"id": batch.id, "medicine_id": batch.medicine_id, "available_quantity": batch.available_quantity}


def _normalized_duplicate(db: Session, model, name: str, exclude_id: int | None = None):
    query = db.query(model).filter(func.lower(func.trim(model.name)) == name.strip().lower())
    if exclude_id is not None:
        query = query.filter(model.id != exclude_id)
    return query.first()


def _commit_or_conflict(db: Session, detail: str) -> None:
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail=detail)


def _medicine_record(db: Session, medicine: Medicine) -> dict:
    category = db.get(MedicineCategory, medicine.category_id)
    record = {
        column.name: getattr(medicine, column.name)
        for column in Medicine.__table__.columns
    }
    record["specializations"] = medicine.specializations or []
    record["category_name"] = category.name if category else None
    return record


def _resolve_category(db: Session, values: dict, actor: User, request: Request) -> dict:
    name = values.pop("category_name", None)
    if name is not None:
        if values.get("category_id"):
            raise HTTPException(status_code=400, detail="Select only one category")
        name = " ".join(name.split())
        if len(name) < 2:
            raise HTTPException(status_code=400, detail="Category name must contain at least two characters")
        category = _normalized_duplicate(db, MedicineCategory, name)
        if category is None:
            category = MedicineCategory(name=name, status="active")
            db.add(category)
            try:
                db.flush()
            except IntegrityError:
                db.rollback()
                raise HTTPException(status_code=409, detail="Category was created concurrently; refresh and retry")
            record_audit_event(
                db, actor=actor, action="pharmacy_master.category_created",
                resource_type="medicine_category", resource_id=str(category.id),
                new_values={"name": name, "status": "active"}, **request_audit_metadata(request),
            )
        values["category_id"] = category.id
    if "category_id" in values:
        category = db.get(MedicineCategory, values["category_id"])
        if not category or category.status != "active":
            raise HTTPException(status_code=400, detail="Select an active medicine category")
    return values


@router.get("/suppliers", response_model=List[SupplierResponse])
def list_suppliers(
    search: str = Query(default="", max_length=150),
    status: str = Query(default="", pattern="^(|active|inactive)$"),
    db: Session = Depends(get_db),
):
    query = db.query(Supplier)
    if search.strip():
        value = f"%{search.strip()}%"
        query = query.filter(or_(
            Supplier.name.ilike(value), Supplier.contact_person.ilike(value),
            Supplier.email.ilike(value), Supplier.phone.ilike(value),
        ))
    if status:
        query = query.filter(Supplier.status == status)
    return query.order_by(Supplier.name).all()


@router.post("/suppliers", response_model=SupplierResponse, status_code=201)
def create_supplier(
    payload: SupplierCreate, request: Request, db: Session = Depends(get_db),
    actor: User = Depends(require_permission(Permission.pharmacy_master_manage)),
):
    if _normalized_duplicate(db, Supplier, payload.name):
        raise HTTPException(status_code=409, detail="A supplier with this name already exists")
    item = Supplier(**payload.model_dump())
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A supplier with this name already exists")
    record_audit_event(
        db, actor=actor, action="pharmacy_master.supplier_created",
        resource_type="supplier", resource_id=str(item.id),
        new_values=payload.model_dump(mode="json"), **request_audit_metadata(request),
    )
    _commit_or_conflict(db, "A supplier with this name already exists")
    db.refresh(item)
    return item


@router.patch("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int, payload: SupplierUpdate, request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission(Permission.pharmacy_master_manage)),
):
    item = db.get(Supplier, supplier_id)
    if not item:
        raise HTTPException(status_code=404, detail="Supplier not found")
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes and _normalized_duplicate(db, Supplier, changes["name"], supplier_id):
        raise HTTPException(status_code=409, detail="A supplier with this name already exists")
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    record_audit_event(
        db, actor=actor, action="pharmacy_master.supplier_updated",
        resource_type="supplier", resource_id=str(item.id),
        old_values=old_values, new_values=changes, **request_audit_metadata(request),
    )
    _commit_or_conflict(db, "A supplier with this name already exists")
    db.refresh(item)
    return item


@router.get("/categories", response_model=List[MedicineCategoryResponse])
def list_categories(
    search: str = Query(default="", max_length=100),
    status: str = Query(default="", pattern="^(|active|inactive)$"),
    db: Session = Depends(get_db),
):
    query = db.query(MedicineCategory)
    if search.strip():
        value = f"%{search.strip()}%"
        query = query.filter(or_(
            MedicineCategory.name.ilike(value),
            MedicineCategory.description.ilike(value),
        ))
    if status:
        query = query.filter(MedicineCategory.status == status)
    return query.order_by(MedicineCategory.name).all()


@router.post("/categories", response_model=MedicineCategoryResponse, status_code=201)
def create_category(
    payload: MedicineCategoryCreate, request: Request, db: Session = Depends(get_db),
    actor: User = Depends(require_permission(Permission.pharmacy_master_manage)),
):
    if _normalized_duplicate(db, MedicineCategory, payload.name):
        raise HTTPException(status_code=409, detail="A medicine category with this name already exists")
    item = MedicineCategory(**payload.model_dump())
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="A medicine category with this name already exists")
    record_audit_event(
        db, actor=actor, action="pharmacy_master.category_created",
        resource_type="medicine_category", resource_id=str(item.id),
        new_values=payload.model_dump(mode="json"), **request_audit_metadata(request),
    )
    _commit_or_conflict(db, "A medicine category with this name already exists")
    db.refresh(item)
    return item


@router.patch("/categories/{category_id}", response_model=MedicineCategoryResponse)
def update_category(
    category_id: int, payload: MedicineCategoryUpdate, request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission(Permission.pharmacy_master_manage)),
):
    item = db.get(MedicineCategory, category_id)
    if not item:
        raise HTTPException(status_code=404, detail="Medicine category not found")
    changes = payload.model_dump(exclude_unset=True)
    if "name" in changes and _normalized_duplicate(db, MedicineCategory, changes["name"], category_id):
        raise HTTPException(status_code=409, detail="A medicine category with this name already exists")
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    record_audit_event(
        db, actor=actor, action="pharmacy_master.category_updated",
        resource_type="medicine_category", resource_id=str(item.id),
        old_values=old_values, new_values=changes, **request_audit_metadata(request),
    )
    _commit_or_conflict(db, "A medicine category with this name already exists")
    db.refresh(item)
    return item


@router.get("/medicines", response_model=List[MedicineResponse])
def list_medicines(
    search: str = Query(default="", max_length=150),
    status: str = Query(default="", pattern="^(|active|inactive)$"),
    category_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    query = db.query(Medicine)
    if search.strip():
        value = f"%{search.strip()}%"
        query = query.filter(or_(
            Medicine.name.ilike(value), Medicine.generic_name.ilike(value),
            Medicine.sku.ilike(value),
        ))
    if status:
        query = query.filter(Medicine.status == status)
    if category_id:
        query = query.filter(Medicine.category_id == category_id)
    return [_medicine_record(db, item) for item in query.order_by(Medicine.name).all()]


@router.post("/medicines", response_model=MedicineResponse, status_code=201)
def create_medicine(
    payload: MedicineCreate, request: Request, db: Session = Depends(get_db),
    actor: User = Depends(require_permission(Permission.pharmacy_master_manage)),
):
    if _normalized_duplicate(db, Medicine, payload.name):
        raise HTTPException(status_code=409, detail="A medicine with this name already exists")
    values = _resolve_category(db, payload.model_dump(), actor, request)
    item = Medicine(**values)
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Medicine name or SKU/code already exists")
    record_audit_event(
        db, actor=actor, action="pharmacy_master.medicine_created",
        resource_type="medicine", resource_id=str(item.id),
        new_values=values, **request_audit_metadata(request),
    )
    _commit_or_conflict(db, "Medicine name or SKU/code already exists")
    db.refresh(item)
    return _medicine_record(db, item)


@router.patch("/medicines/{medicine_id}", response_model=MedicineResponse)
def update_medicine(
    medicine_id: int, payload: MedicineUpdate, request: Request,
    db: Session = Depends(get_db),
    actor: User = Depends(require_permission(Permission.pharmacy_master_manage)),
):
    item = db.get(Medicine, medicine_id)
    if not item:
        raise HTTPException(status_code=404, detail="Medicine not found")
    changes = _resolve_category(db, payload.model_dump(exclude_unset=True), actor, request)
    if "name" in changes and _normalized_duplicate(db, Medicine, changes["name"], medicine_id):
        raise HTTPException(status_code=409, detail="A medicine with this name already exists")
    if changes.get("status") == "active":
        category = db.get(MedicineCategory, changes.get("category_id", item.category_id))
        if not category or category.status != "active":
            raise HTTPException(status_code=400, detail="An active medicine requires an active category")
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    record_audit_event(
        db, actor=actor, action="pharmacy_master.medicine_updated",
        resource_type="medicine", resource_id=str(item.id),
        old_values=old_values, new_values=changes, **request_audit_metadata(request),
    )
    _commit_or_conflict(db, "Medicine name or SKU/code already exists")
    db.refresh(item)
    return _medicine_record(db, item)
