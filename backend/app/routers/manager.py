from datetime import date, datetime, timezone
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.deps import require_permission, require_role
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.core.security import get_password_hash
from app.database import get_db
from app.models.all_models import (
    Appointment, Billing, Department, Doctor, Employee, EmployeePermission,
    Patient, User,
)
from app.schemas.all_schemas import (
    DailyReport, DepartmentCreate, DepartmentResponse, DepartmentStats,
    DepartmentUpdate, DoctorWorkload, StaffAccountCreate, StaffAccountResponse,
)
from app.services.audit_service import record_audit_event, request_audit_metadata


router = APIRouter(prefix="/manager", tags=["manager"])

STAFF_ACCOUNT_ROLES = (
    UserRole.hospital_manager.value,
    UserRole.doctor.value,
    UserRole.receptionist.value,
    UserRole.nurse.value,
    UserRole.pharmacist.value,
    UserRole.lab_technician.value,
    UserRole.radiologist.value,
    UserRole.accountant.value,
    UserRole.insurance_officer.value,
    UserRole.ambulance_staff.value,
)


def _staff_response(db: Session, user: User) -> dict:
    profile_id = None
    if user.role == UserRole.doctor.value:
        profile_id = db.query(Doctor.id).filter(Doctor.user_id == user.id).scalar()
    elif user.role == UserRole.receptionist.value:
        profile_id = db.query(Employee.id).filter(Employee.user_id == user.id).scalar()
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "is_active": bool(user.is_active),
        "profile_id": profile_id,
        "created_at": user.created_at,
    }


@router.get("/staff", response_model=List[StaffAccountResponse])
def get_staff(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.staff_view)),
):
    users = db.query(User).filter(User.role.in_(STAFF_ACCOUNT_ROLES)).order_by(User.name).all()
    return [_staff_response(db, user) for user in users]


@router.post("/staff", response_model=StaffAccountResponse, status_code=201)
def create_staff_account(
    staff_in: StaffAccountCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
    _: User = Depends(require_permission(Permission.staff_create)),
):
    normalized_email = str(staff_in.email).lower()
    if db.query(User).filter(User.email == normalized_email).first():
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        user = User(
            name=staff_in.name,
            email=normalized_email,
            password_hash=get_password_hash(staff_in.password),
            role=staff_in.role.value,
            is_active=True,
            is_email_verified=True,
            email_verified_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.flush()

        profile_id = None
        if staff_in.role == UserRole.doctor:
            doctor = Doctor(
                user_id=user.id,
                name=user.name,
                specialization=staff_in.specialization,
                consultation_fee=staff_in.consultation_fee,
                contact=staff_in.contact,
                timing_start=staff_in.timing_start,
                timing_end=staff_in.timing_end,
                status="active",
            )
            db.add(doctor)
            db.flush()
            profile_id = doctor.id
        elif staff_in.role == UserRole.receptionist:
            employee = Employee(
                user_id=user.id,
                designation=staff_in.designation,
                joining_date=staff_in.joining_date,
                shift_start=staff_in.shift_start,
                shift_end=staff_in.shift_end,
                status="active",
                added_by=current_user.id,
            )
            db.add(employee)
            db.flush()
            db.add(EmployeePermission(
                employee_id=employee.id,
                can_register_patient=0,
                can_schedule_appointment=0,
                can_checkin_patient=0,
                can_collect_billing=0,
                can_view_reports=0,
            ))
            profile_id = employee.id

        record_audit_event(
            db,
            actor=current_user,
            action="staff.account_created",
            resource_type="user",
            resource_id=str(user.id),
            new_values={"email": user.email, "role": user.role, "profile_id": profile_id},
            **request_audit_metadata(request),
        )
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise

    return _staff_response(db, user)


@router.get("/overview")
def get_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    today = date.today()
    return {
        "total_patients": db.query(Patient).count(),
        "total_doctors": db.query(Doctor).count(),
        "total_departments": db.query(Department).count(),
        "today_appointments": db.query(Appointment).filter(Appointment.appt_date == today).count(),
    }


@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.departments_view)),
):
    return db.query(Department).order_by(Department.name).all()


@router.post("/departments", response_model=DepartmentResponse, status_code=201)
def create_department(
    department: DepartmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.departments_manage)),
):
    item = Department(**department.model_dump())
    db.add(item)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Department name already exists")
    record_audit_event(
        db, actor=current_user, action="department.created", resource_type="department",
        resource_id=str(item.department_id), new_values=department.model_dump(),
        **request_audit_metadata(request),
    )
    db.commit()
    db.refresh(item)
    return item


@router.put("/departments/{department_id}", response_model=DepartmentResponse)
def update_department(
    department_id: int,
    department: DepartmentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission(Permission.departments_manage)),
):
    item = db.get(Department, department_id)
    if not item:
        raise HTTPException(status_code=404, detail="Department not found")
    changes = department.model_dump(exclude_unset=True)
    old_values = {key: getattr(item, key) for key in changes}
    for key, value in changes.items():
        setattr(item, key, value)
    record_audit_event(
        db, actor=current_user, action="department.updated", resource_type="department",
        resource_id=str(department_id), old_values=old_values, new_values=changes,
        **request_audit_metadata(request),
    )
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Department name already exists")
    db.refresh(item)
    return item


@router.get("/reports", response_model=DailyReport)
def get_daily_report(
    target_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    report_date = target_date or date.today()
    appointments = db.query(Appointment).filter(Appointment.appt_date == report_date)
    bills = db.query(Billing).filter(func.date(Billing.created_at) == report_date)
    revenue = db.query(func.coalesce(func.sum(Billing.amount), 0)).filter(
        func.date(Billing.paid_at) == report_date, Billing.status == "paid",
    ).scalar()
    return DailyReport(
        date=report_date,
        patient_count=db.query(Patient).filter(func.date(Patient.created_at) == report_date).count(),
        appointment_count=appointments.count(),
        completed_consultations=appointments.filter(Appointment.status == "completed").count(),
        cancelled_appointments=appointments.filter(Appointment.status == "cancelled").count(),
        pending_bills=bills.filter(Billing.status == "pending").count(),
        paid_bills=bills.filter(Billing.status == "paid").count(),
        revenue_summary=Decimal(revenue or 0),
    )


@router.get("/analytics/doctors", response_model=List[DoctorWorkload])
def get_doctor_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    rows = []
    for doctor in db.query(Doctor).order_by(Doctor.name):
        base = db.query(Appointment).filter(Appointment.doctor_id == doctor.id)
        rows.append(DoctorWorkload(
            doctor_id=doctor.id,
            name=doctor.name,
            appointments_completed=base.filter(Appointment.status == "completed").count(),
            appointments_pending=base.filter(Appointment.status.in_(["requested", "confirmed", "checked_in", "in_progress"])).count(),
        ))
    return rows


@router.get("/analytics/departments", response_model=List[DepartmentStats])
def get_department_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    rows = []
    for department in db.query(Department).order_by(Department.name):
        doctor_ids = [row[0] for row in db.query(Doctor.id).filter(Doctor.department_id == department.department_id)]
        appointment_count = (
            db.query(Appointment).filter(Appointment.doctor_id.in_(doctor_ids)).count()
            if doctor_ids else 0
        )
        rows.append(DepartmentStats(
            department_id=department.department_id,
            name=department.name,
            doctor_count=len(doctor_ids),
            appointment_count=appointment_count,
        ))
    return rows
