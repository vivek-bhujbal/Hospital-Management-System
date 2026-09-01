import uuid
from collections import defaultdict
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
    Appointment, Billing, Expense, ExpenseCategory,
    FinancialTransaction, Patient, User,
)
from app.schemas.all_schemas import AccountantPaymentCreate, ExpenseCategoryCreate, ExpenseCreate
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(
    prefix="/accountant",
    tags=["accountant"],
    dependencies=[Depends(require_exact_role(UserRole.accountant))],
)


def _decimal(value) -> Decimal:
    return Decimal(str(value or 0)).quantize(Decimal("0.01"))


def _invoice_query(db: Session):
    return db.query(Billing, Patient, Appointment).join(
        Patient, Billing.patient_id == Patient.id,
    ).join(Appointment, Billing.appointment_id == Appointment.id)


def _invoice_record(row) -> dict:
    invoice, patient, appointment = row
    return {
        "id": invoice.id,
        "patient_id": patient.id,
        "patient_name": patient.name,
        "appointment_id": appointment.id,
        "appointment_date": appointment.appt_date,
        "amount": invoice.amount,
        "status": invoice.status,
        "payment_method": invoice.payment_method,
        "receipt_no": invoice.receipt_no,
        "paid_at": invoice.paid_at,
        "created_at": invoice.created_at,
    }


def _payment_query(db: Session):
    return db.query(FinancialTransaction, Billing, Patient, User).join(
        Billing,
        (FinancialTransaction.reference_type == "billing")
        & (FinancialTransaction.reference_id == Billing.id),
    ).join(Patient, Billing.patient_id == Patient.id).join(
        User, FinancialTransaction.recorded_by == User.id,
    ).filter(FinancialTransaction.transaction_type == "payment")


def _payment_record(row) -> dict:
    transaction, invoice, patient, collector = row
    return {
        "id": transaction.id,
        "invoice_id": invoice.id,
        "patient_id": patient.id,
        "patient_name": patient.name,
        "amount": transaction.amount,
        "payment_method": transaction.payment_method,
        "payment_date": transaction.transaction_date,
        "collector_id": collector.id,
        "collector_name": collector.name,
        "receipt_no": invoice.receipt_no,
    }


def _expense_query(db: Session):
    return db.query(Expense, ExpenseCategory, User).join(
        ExpenseCategory, Expense.category_id == ExpenseCategory.id,
    ).join(User, Expense.recorded_by == User.id)


def _expense_record(row) -> dict:
    expense, category, recorder = row
    return {
        "id": expense.id,
        "category_id": category.id,
        "category_name": category.name,
        "amount": expense.amount,
        "description": expense.description,
        "supporting_reference": expense.supporting_reference,
        "incurred_date": expense.incurred_date,
        "recorded_by": recorder.id,
        "recorded_by_name": recorder.name,
        "idempotency_key": expense.idempotency_key,
        "created_at": expense.created_at,
    }


@router.get("/dashboard")
def get_financial_dashboard(db: Session = Depends(get_db)):
    today = date.today()
    today_payments = db.query(FinancialTransaction).filter(
        FinancialTransaction.transaction_type == "payment",
        func.date(FinancialTransaction.transaction_date) == today,
    )
    pending = db.query(Billing).filter(Billing.status == "pending")
    paid = db.query(Billing).filter(Billing.status == "paid")
    today_expenses = db.query(Expense).filter(Expense.incurred_date == today)
    total_revenue = _decimal(db.query(func.sum(FinancialTransaction.amount)).filter(
        FinancialTransaction.transaction_type == "payment",
    ).scalar())
    total_expenses = _decimal(db.query(func.sum(FinancialTransaction.amount)).filter(
        FinancialTransaction.transaction_type == "expense",
    ).scalar())
    total_refunds = _decimal(db.query(func.sum(FinancialTransaction.amount)).filter(
        FinancialTransaction.transaction_type == "refund",
    ).scalar())
    outstanding = _decimal(pending.with_entities(func.sum(Billing.amount)).scalar())
    return {
        "today_revenue": _decimal(today_payments.with_entities(
            func.sum(FinancialTransaction.amount),
        ).scalar()),
        "pending_invoices": pending.count(),
        "paid_invoices": paid.count(),
        "outstanding_amount": outstanding,
        "today_payments": today_payments.count(),
        "today_expenses": _decimal(today_expenses.with_entities(func.sum(Expense.amount)).scalar()),
        "financial_summary": {
            "revenue": total_revenue,
            "expenses": total_expenses,
            "refunds": total_refunds,
            "outstanding": outstanding,
            "net": total_revenue - total_expenses - total_refunds,
        },
    }


@router.get("/invoices")
def get_invoices(
    search: str | None = None,
    status: Literal["pending", "paid"] | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    _validate_dates(start_date, end_date)
    query = _invoice_query(db)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(Patient.name.ilike(term), Billing.receipt_no.ilike(term)))
    if status:
        query = query.filter(Billing.status == status)
    if start_date:
        query = query.filter(func.date(Billing.created_at) >= start_date)
    if end_date:
        query = query.filter(func.date(Billing.created_at) <= end_date)
    return [_invoice_record(row) for row in query.order_by(Billing.created_at.desc()).all()]


@router.post("/invoices/{invoice_id}/pay")
def record_invoice_payment(
    invoice_id: int,
    payload: AccountantPaymentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_exact_role(UserRole.accountant)),
):
    invoice = db.query(Billing).filter(Billing.id == invoice_id).with_for_update().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    method = payload.payment_method.value
    if invoice.status == "paid":
        existing = _payment_query(db).filter(FinancialTransaction.reference_id == invoice.id).first()
        if existing and invoice.payment_method == method:
            return _payment_record(existing)
        raise HTTPException(status_code=409, detail="Invoice has already been paid")

    invoice.status = "paid"
    invoice.payment_method = method
    invoice.collected_by = None
    invoice.receipt_no = f"REC-{uuid.uuid4().hex[:12].upper()}"
    invoice.paid_at = func.now()
    transaction = FinancialTransaction(
        transaction_type="payment", amount=invoice.amount,
        reference_type="billing", reference_id=invoice.id,
        payment_method=method, recorded_by=current_user.id,
    )
    db.add(transaction)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="accounting.payment_recorded",
        resource_type="billing", resource_id=str(invoice.id),
        new_values={
            "transaction_id": transaction.id, "amount": invoice.amount,
            "payment_method": method, "receipt_no": invoice.receipt_no,
        }, **request_audit_metadata(request),
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = _payment_query(db).filter(FinancialTransaction.reference_id == invoice_id).first()
        if existing:
            return _payment_record(existing)
        raise HTTPException(status_code=409, detail="Payment conflicted with another request")
    return _payment_record(_payment_query(db).filter(FinancialTransaction.id == transaction.id).one())


@router.get("/payments")
def get_payments(
    search: str | None = None,
    payment_method: Literal["cash", "card", "upi"] | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    _validate_dates(start_date, end_date)
    query = _payment_query(db)
    if search:
        term = f"%{search.strip()}%"
        query = query.filter(or_(Patient.name.ilike(term), Billing.receipt_no.ilike(term)))
    if payment_method:
        query = query.filter(FinancialTransaction.payment_method == payment_method)
    if start_date:
        query = query.filter(func.date(FinancialTransaction.transaction_date) >= start_date)
    if end_date:
        query = query.filter(func.date(FinancialTransaction.transaction_date) <= end_date)
    return [_payment_record(row) for row in query.order_by(
        FinancialTransaction.transaction_date.desc(),
    ).all()]


@router.get("/expense-categories")
def get_expense_categories(db: Session = Depends(get_db)):
    return db.query(ExpenseCategory).order_by(ExpenseCategory.name).all()


@router.post("/expense-categories", status_code=201)
def create_expense_category(
    payload: ExpenseCategoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_exact_role(UserRole.accountant)),
):
    name = " ".join(payload.name.split())
    existing = db.query(ExpenseCategory).filter(func.lower(ExpenseCategory.name) == name.lower()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Expense category already exists")
    category = ExpenseCategory(name=name, description=payload.description)
    db.add(category)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="accounting.expense_category_created",
        resource_type="expense_category", resource_id=str(category.id),
        new_values={"name": category.name, "description": category.description},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(category)
    return category


@router.get("/expenses")
def get_expenses(
    category_id: int | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    _validate_dates(start_date, end_date)
    query = _expense_query(db)
    if category_id:
        query = query.filter(Expense.category_id == category_id)
    if start_date:
        query = query.filter(Expense.incurred_date >= start_date)
    if end_date:
        query = query.filter(Expense.incurred_date <= end_date)
    return [_expense_record(row) for row in query.order_by(
        Expense.incurred_date.desc(), Expense.id.desc(),
    ).all()]


@router.post("/expenses", status_code=201)
def create_expense(
    payload: ExpenseCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_exact_role(UserRole.accountant)),
):
    existing = db.query(Expense).filter(Expense.idempotency_key == payload.idempotency_key).first()
    if existing:
        return _expense_record(_expense_query(db).filter(Expense.id == existing.id).one())
    if not db.get(ExpenseCategory, payload.category_id):
        raise HTTPException(status_code=400, detail="Expense category does not exist")
    expense = Expense(**payload.model_dump(), recorded_by=current_user.id)
    db.add(expense)
    db.flush()
    db.add(FinancialTransaction(
        transaction_type="expense", amount=expense.amount,
        reference_id=expense.id, reference_type="expense",
        recorded_by=current_user.id,
    ))
    record_audit_event(
        db, actor=current_user, action="accounting.expense_recorded",
        resource_type="expense", resource_id=str(expense.id),
        new_values={
            "category_id": expense.category_id, "amount": expense.amount,
            "incurred_date": expense.incurred_date, "description": expense.description,
            "supporting_reference": expense.supporting_reference,
        }, **request_audit_metadata(request),
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing = db.query(Expense).filter(Expense.idempotency_key == payload.idempotency_key).first()
        if existing:
            return _expense_record(_expense_query(db).filter(Expense.id == existing.id).one())
        raise HTTPException(status_code=409, detail="Expense conflicted with another request")
    return _expense_record(_expense_query(db).filter(Expense.id == expense.id).one())


@router.get("/reports")
def get_financial_report(
    start_date: date | None = None,
    end_date: date | None = None,
    period: Literal["daily", "monthly"] = "daily",
    db: Session = Depends(get_db),
):
    _validate_dates(start_date, end_date)
    query = db.query(FinancialTransaction)
    if start_date:
        query = query.filter(func.date(FinancialTransaction.transaction_date) >= start_date)
    if end_date:
        query = query.filter(func.date(FinancialTransaction.transaction_date) <= end_date)
    transactions = query.order_by(FinancialTransaction.transaction_date).all()
    totals = defaultdict(lambda: Decimal("0.00"))
    groups = defaultdict(lambda: defaultdict(lambda: Decimal("0.00")))
    payment_methods = defaultdict(lambda: {"count": 0, "amount": Decimal("0.00")})
    for transaction in transactions:
        amount = _decimal(transaction.amount)
        totals[transaction.transaction_type] += amount
        stamp = transaction.transaction_date
        key = stamp.strftime("%Y-%m") if period == "monthly" else stamp.date().isoformat()
        groups[key][transaction.transaction_type] += amount
        if transaction.transaction_type == "payment":
            method = transaction.payment_method or "unknown"
            payment_methods[method]["count"] += 1
            payment_methods[method]["amount"] += amount

    outstanding_rows = _invoice_query(db).filter(
        Billing.status == "pending",
    ).order_by(Billing.created_at.desc()).limit(100).all()
    outstanding_amount = sum(
        (_decimal(row[0].amount) for row in outstanding_rows), Decimal("0.00"),
    )
    revenue, expenses, refunds = totals["payment"], totals["expense"], totals["refund"]
    return {
        "start_date": start_date, "end_date": end_date, "period": period,
        "revenue": revenue, "expenses": expenses, "refunds": refunds,
        "net": revenue - expenses - refunds,
        "outstanding_amount": outstanding_amount,
        "outstanding_invoices": [_invoice_record(row) for row in outstanding_rows],
        "payment_summary": [
            {"payment_method": method, **values}
            for method, values in sorted(payment_methods.items())
        ],
        "period_summary": [
            {
                "period": key, "revenue": values["payment"],
                "expenses": values["expense"], "refunds": values["refund"],
                "net": values["payment"] - values["expense"] - values["refund"],
            }
            for key, values in sorted(groups.items(), reverse=True)
        ],
    }


def _validate_dates(start_date: date | None, end_date: date | None) -> None:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date cannot be after end_date")
