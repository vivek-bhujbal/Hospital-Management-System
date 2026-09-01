from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import date
from decimal import Decimal

from app.database import get_db
from app.models.all_models import (
    User, Billing, Expense, ExpenseCategory, FinancialTransaction, Refund, DailyClosing
)
from app.schemas.all_schemas import (
    BillingResponse, ExpenseCreate, ExpenseResponse,
    FinancialTransactionResponse, RefundCreate, RefundResponse, DailyClosingResponse
)
from app.core.deps import require_permission
from app.core.permissions import Permission
from app.services.audit_service import record_audit_event, request_audit_metadata

router = APIRouter(prefix="/accountant", tags=["accountant"])

@router.get("/dashboard")
def get_financial_dashboard(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.accounting_view)),
):
    today = date.today()
    
    total_revenue_today = db.query(func.sum(FinancialTransaction.amount)).filter(
        FinancialTransaction.transaction_type == 'payment',
        func.date(FinancialTransaction.transaction_date) == today
    ).scalar() or 0.0
    
    total_expenses_today = db.query(func.sum(Expense.amount)).filter(
        Expense.incurred_date == today
    ).scalar() or 0.0
    
    pending_dues = db.query(func.sum(Billing.amount)).filter(
        Billing.status == 'pending'
    ).scalar() or 0.0
    
    return {
        "total_revenue_today": total_revenue_today,
        "total_expenses_today": total_expenses_today,
        "pending_dues": pending_dues,
    }

@router.get("/transactions", response_model=List[FinancialTransactionResponse])
def get_transactions(
    start_date: date = None, end_date: date = None, db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.accounting_view)),
):
    query = db.query(FinancialTransaction)
    if start_date:
        query = query.filter(func.date(FinancialTransaction.transaction_date) >= start_date)
    if end_date:
        query = query.filter(func.date(FinancialTransaction.transaction_date) <= end_date)
    return query.order_by(FinancialTransaction.transaction_date.desc()).all()

@router.get("/expenses", response_model=List[ExpenseResponse])
def get_expenses(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.accounting_view)),
):
    return db.query(Expense).order_by(Expense.incurred_date.desc(), Expense.id.desc()).all()


@router.post("/expenses", response_model=ExpenseResponse, status_code=201)
def create_expense(
    expense_in: ExpenseCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.accounting_record_expense)),
):
    existing = db.query(Expense).filter_by(idempotency_key=expense_in.idempotency_key).first()
    if existing:
        return existing
    if not db.get(ExpenseCategory, expense_in.category_id):
        raise HTTPException(status_code=400, detail="Expense category does not exist")
    new_expense = Expense(**expense_in.model_dump(), recorded_by=current_user.id)
    db.add(new_expense)
    db.flush()
    
    # Create matching financial transaction
    st_tx = FinancialTransaction(
        transaction_type='expense',
        amount=expense_in.amount,
        reference_id=new_expense.id,
        reference_type='expense',
        recorded_by=current_user.id
    )
    db.add(st_tx)
    
    record_audit_event(
        db, actor=current_user, action="accounting.expense_recorded",
        resource_type="expense", resource_id=str(new_expense.id),
        new_values=expense_in.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(new_expense)
    return new_expense

@router.get("/refunds", response_model=List[RefundResponse])
def get_refunds(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.accounting_view)),
):
    return db.query(Refund).order_by(Refund.created_at.desc()).all()


@router.post("/refunds", response_model=RefundResponse, status_code=201)
def process_refund(
    refund_in: RefundCreate, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.billing_refund)),
):
    existing = db.query(Refund).filter_by(idempotency_key=refund_in.idempotency_key).first()
    if existing:
        return existing
    original_tx = db.query(FinancialTransaction).filter(
        FinancialTransaction.id == refund_in.transaction_id,
    ).with_for_update().first()
    
    if not original_tx:
        raise HTTPException(status_code=404, detail="Original transaction not found")
        
    if original_tx.transaction_type != 'payment':
        raise HTTPException(status_code=400, detail="Can only refund payments")
        
    # Check already refunded amount
    past_refunds = db.query(func.sum(Refund.amount)).filter(
        Refund.transaction_id == refund_in.transaction_id,
    ).scalar() or Decimal("0.00")
    
    if past_refunds + refund_in.amount > original_tx.amount:
        raise HTTPException(status_code=400, detail="Refund amount exceeds originally paid amount")
        
    new_refund = Refund(**refund_in.model_dump(), processed_by=current_user.id)
    db.add(new_refund)
    db.flush()
    
    refund_tx = FinancialTransaction(
        transaction_type='refund',
        amount=refund_in.amount,
        reference_id=new_refund.id,
        reference_type='refund',
        recorded_by=current_user.id
    )
    db.add(refund_tx)
    
    record_audit_event(
        db, actor=current_user, action="accounting.refund_processed",
        resource_type="refund", resource_id=str(new_refund.id),
        new_values=refund_in.model_dump(), **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(new_refund)
    return new_refund

@router.get("/daily-closings", response_model=List[DailyClosingResponse])
def get_daily_closings(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.accounting_view)),
):
    return db.query(DailyClosing).order_by(DailyClosing.closing_date.desc()).limit(366).all()


@router.post("/daily-closing", response_model=DailyClosingResponse)
def perform_daily_closing(
    closing_date: date, request: Request, db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.accounting_close_day)),
):
    existing = db.query(DailyClosing).filter(DailyClosing.closing_date == closing_date).first()
    if existing:
        return existing
    if closing_date > date.today():
        raise HTTPException(status_code=400, detail="Cannot close a future date")
        
    total_revenue = db.query(func.sum(FinancialTransaction.amount)).filter(
        FinancialTransaction.transaction_type == 'payment',
        func.date(FinancialTransaction.transaction_date) == closing_date
    ).scalar() or Decimal("0.00")
    
    total_expenses = db.query(func.sum(FinancialTransaction.amount)).filter(
        FinancialTransaction.transaction_type == 'expense',
        func.date(FinancialTransaction.transaction_date) == closing_date
    ).scalar() or Decimal("0.00")
    
    total_refunds = db.query(func.sum(FinancialTransaction.amount)).filter(
        FinancialTransaction.transaction_type == 'refund',
        func.date(FinancialTransaction.transaction_date) == closing_date
    ).scalar() or Decimal("0.00")
    
    net_amount = total_revenue - total_expenses - total_refunds
    
    closing = DailyClosing(
        closing_date=closing_date,
        total_revenue=total_revenue,
        total_expenses=total_expenses,
        total_refunds=total_refunds,
        net_amount=net_amount,
        closed_by=current_user.id
    )
    
    db.add(closing)
    db.flush()
    record_audit_event(
        db, actor=current_user, action="accounting.day_closed",
        resource_type="daily_closing", resource_id=str(closing.id),
        new_values={"closing_date": closing_date, "net_amount": net_amount},
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(closing)
    return closing


# Export only the finalized exact-role Accountant API. The legacy implementation
# above remains import-compatible for older references but is not mounted.
from app.routers.accountant_finance import router as router
