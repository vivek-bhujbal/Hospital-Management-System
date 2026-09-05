from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import List
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_exact_role, require_permission
from app.core.config import settings
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import (
    Appointment,
    Billing,
    Department,
    Doctor,
    Employee,
    FinancialTransaction,
    Patient,
    User,
)
from app.schemas.all_schemas import (
    ApptStatusEnum,
    DailyReport,
    DepartmentResponse,
    DepartmentStats,
    DoctorWorkload,
    ManagerAppointment,
    ManagerBill,
    ManagerDepartmentSummary,
    ManagerDoctor,
    ManagerOverview,
    ManagerPatient,
    ManagerStaff,
)


router = APIRouter(
    prefix="/manager",
    tags=["manager"],
    dependencies=[Depends(require_exact_role(UserRole.hospital_manager))],
)

PENDING_APPOINTMENT_STATUSES = ("requested", "confirmed", "checked_in", "in_progress")
OPERATIONAL_STAFF_ROLES = (
    UserRole.receptionist.value,
    UserRole.nurse.value,
    UserRole.pharmacist.value,
    UserRole.lab_technician.value,
    UserRole.radiologist.value,
    UserRole.accountant.value,
    UserRole.insurance_officer.value,
    UserRole.ambulance_staff.value,
)
MANAGER_STAFF_DIRECTORY_ROLES = (
    UserRole.hospital_manager.value,
    UserRole.doctor.value,
    *OPERATIONAL_STAFF_ROLES,
)


def _hospital_timezone():
    try:
        return ZoneInfo(settings.HOSPITAL_TIMEZONE)
    except ZoneInfoNotFoundError:
        return timezone.utc


def _hospital_today() -> date:
    return datetime.now(_hospital_timezone()).date()


def _utc_bounds(value: date) -> tuple[datetime, datetime]:
    hospital_tz = _hospital_timezone()
    start = datetime.combine(value, time.min, tzinfo=hospital_tz)
    end = datetime.combine(value + timedelta(days=1), time.min, tzinfo=hospital_tz)
    return (
        start.astimezone(timezone.utc).replace(tzinfo=None),
        end.astimezone(timezone.utc).replace(tzinfo=None),
    )


def _availability(*, active: bool, shift_start=None, shift_end=None) -> str:
    if not active:
        return "Unavailable"
    now = datetime.now(_hospital_timezone()).time().replace(tzinfo=None)
    if shift_start and shift_end:
        working = (
            shift_start <= now < shift_end
            if shift_start < shift_end
            else now >= shift_start or now < shift_end
        )
        if not working:
            return "Off shift"
    elif shift_start and now < shift_start:
        return "Off shift"
    elif shift_end and now >= shift_end:
        return "Off shift"
    return "Available"


@router.get("/overview", response_model=ManagerOverview)
def get_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    today = _hospital_today()
    today_query = db.query(Appointment).filter(Appointment.appt_date == today)
    patient_flow = {
        status: today_query.filter(Appointment.status == status).count()
        for status in ("requested", "confirmed", "checked_in", "in_progress", "completed", "cancelled")
    }
    active_doctors = db.query(Doctor).filter(Doctor.status == "active").count()
    active_staff = db.query(User).filter(
        User.role.in_(OPERATIONAL_STAFF_ROLES),
        User.is_active.is_(True),
    ).count()
    on_leave_doctors = db.query(Doctor).filter(Doctor.status == "on_leave").count()
    inactive_staff = db.query(User).filter(
        User.role.in_(OPERATIONAL_STAFF_ROLES),
        User.is_active.is_(False),
    ).count()

    alerts: list[str] = []
    if patient_flow["checked_in"]:
        alerts.append(f'{patient_flow["checked_in"]} checked-in patient(s) waiting for consultation')
    if on_leave_doctors:
        alerts.append(f"{on_leave_doctors} doctor(s) currently on leave")
    if inactive_staff:
        alerts.append(f"{inactive_staff} operational staff account(s) inactive")
    if patient_flow["cancelled"]:
        alerts.append(f'{patient_flow["cancelled"]} appointment cancellation(s) today')

    departments = []
    for department in db.query(Department).order_by(Department.name):
        active_department_doctors = db.query(Doctor.id).filter(
            Doctor.department_id == department.department_id,
            Doctor.status == "active",
        ).count()
        department_appointments = db.query(Appointment.id).join(
            Doctor, Appointment.doctor_id == Doctor.id,
        ).filter(
            Doctor.department_id == department.department_id,
            Appointment.appt_date == today,
        ).count()
        departments.append(ManagerDepartmentSummary(
            department_id=department.department_id,
            name=department.name,
            active_doctors=active_department_doctors,
            today_appointments=department_appointments,
        ))

    return ManagerOverview(
        today_appointments=today_query.count(),
        total_appointments=db.query(Appointment).count(),
        total_patients=db.query(Patient).count(),
        active_doctors=active_doctors,
        active_staff=active_staff,
        total_completed_consultations=db.query(Appointment).filter(
            Appointment.status == 'completed',
        ).count(),
        completed_consultations=patient_flow["completed"],
        pending_appointments=sum(patient_flow[status] for status in PENDING_APPOINTMENT_STATUSES),
        operational_alerts=alerts,
        patient_flow=patient_flow,
        department_summary=departments,
    )


@router.get("/appointments", response_model=List[ManagerAppointment])
def get_appointments(
    target_date: date | None = None,
    doctor_id: int | None = None,
    department_id: int | None = None,
    status: ApptStatusEnum | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.appointments_view)),
):
    query = db.query(
        Appointment,
        Patient.name.label("patient_name"),
        Doctor.name.label("doctor_name"),
        Doctor.department_id,
        Department.name.label("department_name"),
    ).join(
        Patient, Appointment.patient_id == Patient.id,
    ).join(
        Doctor, Appointment.doctor_id == Doctor.id,
    ).outerjoin(
        Department, Doctor.department_id == Department.department_id,
    )
    if target_date:
        query = query.filter(Appointment.appt_date == target_date)
    if doctor_id:
        query = query.filter(Appointment.doctor_id == doctor_id)
    if department_id:
        query = query.filter(Doctor.department_id == department_id)
    if status:
        query = query.filter(Appointment.status == status.value)

    rows = query.order_by(Appointment.appt_date.desc(), Appointment.appt_time.asc()).all()
    return [ManagerAppointment(
        id=appointment.id,
        patient_id=appointment.patient_id,
        patient_name=patient_name,
        doctor_id=appointment.doctor_id,
        doctor_name=doctor_name,
        department_id=department_id_value,
        department_name=department_name,
        appt_date=appointment.appt_date,
        appt_time=appointment.appt_time,
        reason=appointment.reason,
        status=appointment.status,
        checked_in_at=appointment.checked_in_at,
    ) for appointment, patient_name, doctor_name, department_id_value, department_name in rows]


@router.get("/patients", response_model=List[ManagerPatient])
def get_patients(
    registered_on: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.patients_view)),
):
    today = _hospital_today()
    result = []
    patients = db.query(Patient)
    if registered_on:
        registered_start, registered_end = _utc_bounds(registered_on)
        patients = patients.filter(
            Patient.created_at >= registered_start,
            Patient.created_at < registered_end,
        )
    for patient in patients.order_by(Patient.name):
        appointments = db.query(Appointment).filter(Appointment.patient_id == patient.id)
        last_date = appointments.filter(
            Appointment.appt_date <= today,
            Appointment.status == 'completed',
        ).with_entities(
            func.max(Appointment.appt_date),
        ).scalar()
        next_date = appointments.filter(
            Appointment.appt_date >= today,
            Appointment.status.notin_(("completed", "cancelled")),
        ).with_entities(func.min(Appointment.appt_date)).scalar()
        result.append(ManagerPatient(
            id=patient.id,
            name=patient.name,
            age=patient.age,
            gender=patient.gender,
            contact=patient.contact,
            created_at=patient.created_at,
            appointment_count=appointments.count(),
            last_appointment_date=last_date,
            next_appointment_date=next_date,
        ))
    return result


@router.get('/bills', response_model=List[ManagerBill])
def get_bills(
    target_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.billing_report)),
):
    query = db.query(
        Billing,
        Patient.name.label('patient_name'),
    ).join(
        Patient, Billing.patient_id == Patient.id,
    ).join(
        Appointment, Billing.appointment_id == Appointment.id,
    )
    if target_date:
        query = query.filter(Appointment.appt_date == target_date)
    rows = query.order_by(Billing.id.desc()).all()
    return [ManagerBill(
        id=bill.id,
        appointment_id=bill.appointment_id,
        patient_id=bill.patient_id,
        patient_name=patient_name,
        amount=bill.amount,
        status=bill.status,
        payment_method=bill.payment_method,
        paid_at=bill.paid_at,
    ) for bill, patient_name in rows]


@router.get("/doctors", response_model=List[ManagerDoctor])
def get_doctors(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.doctors_view)),
):
    today = _hospital_today()
    department_names = {
        department.department_id: department.name
        for department in db.query(Department).all()
    }
    result = []
    for doctor in db.query(Doctor).order_by(Doctor.name):
        appointments = db.query(Appointment).filter(Appointment.doctor_id == doctor.id)
        active = doctor.status == "active"
        result.append(ManagerDoctor(
            id=doctor.id,
            name=doctor.name,
            specialization=doctor.specialization,
            department_id=doctor.department_id,
            department_name=department_names.get(doctor.department_id),
            timing_start=doctor.timing_start,
            timing_end=doctor.timing_end,
            status=doctor.status,
            availability=_availability(
                active=active,
                shift_start=doctor.timing_start,
                shift_end=doctor.timing_end,
            ),
            appointments_today=appointments.filter(Appointment.appt_date == today).count(),
            appointments_pending=appointments.filter(
                Appointment.status.in_(PENDING_APPOINTMENT_STATUSES),
            ).count(),
            appointments_completed=appointments.filter(Appointment.status == "completed").count(),
        ))
    return result


@router.get("/staff", response_model=List[ManagerStaff])
def get_staff(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.staff_view)),
):
    result = []
    users = db.query(User).filter(User.role.in_(MANAGER_STAFF_DIRECTORY_ROLES)).order_by(User.name).all()
    doctors_by_user_id = {
        doctor.user_id: doctor
        for doctor in db.query(Doctor).filter(Doctor.user_id.isnot(None)).all()
    }
    employees_by_user_id = {
        employee.user_id: employee
        for employee in db.query(Employee).all()
    }
    department_names = {
        department.department_id: department.name
        for department in db.query(Department).all()
    }
    for user in users:
        doctor = doctors_by_user_id.get(user.id) if user.role == UserRole.doctor.value else None
        if user.role == UserRole.doctor.value and not doctor:
            continue
        employee = employees_by_user_id.get(user.id) if user.role != UserRole.doctor.value else None
        if user.role == UserRole.doctor.value:
            profile_active = bool(doctor and doctor.status == "active")
        elif employee:
            profile_active = employee.status == "active"
        else:
            profile_active = True
        active = bool(user.is_active) and profile_active
        designation = (
            doctor.specialization if doctor and doctor.specialization
            else employee.designation if employee
            else user.role.replace("_", " ").title()
        )
        shift_start = doctor.timing_start if doctor else employee.shift_start if employee else None
        shift_end = doctor.timing_end if doctor else employee.shift_end if employee else None
        result.append(ManagerStaff(
            id=user.id,
            name=user.name,
            role=user.role,
            designation=designation,
            department_name=department_names.get(doctor.department_id) if doctor else None,
            shift_start=shift_start,
            shift_end=shift_end,
            status="active" if active else "inactive",
            availability=_availability(
                active=active,
                shift_start=shift_start,
                shift_end=shift_end,
            ),
        ))
    return result


@router.get("/departments", response_model=List[DepartmentResponse])
def get_departments(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.departments_view)),
):
    return db.query(Department).order_by(Department.name).all()


@router.get("/reports", response_model=DailyReport)
def get_daily_report(
    target_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    report_date = target_date or _hospital_today()
    report_start, report_end = _utc_bounds(report_date)
    appointments = db.query(Appointment).filter(Appointment.appt_date == report_date)
    bills = db.query(Billing).join(
        Appointment, Billing.appointment_id == Appointment.id,
    ).filter(Appointment.appt_date == report_date)
    payments = db.query(FinancialTransaction).filter(
        FinancialTransaction.transaction_type == "payment",
    )
    revenue = payments.with_entities(
        func.coalesce(func.sum(FinancialTransaction.amount), 0),
    ).filter(
        FinancialTransaction.transaction_date >= report_start,
        FinancialTransaction.transaction_date < report_end,
    ).scalar()
    total_revenue = payments.with_entities(
        func.coalesce(func.sum(FinancialTransaction.amount), 0),
    ).scalar()
    return DailyReport(
        date=report_date,
        patient_count=db.query(Patient).filter(
            Patient.created_at >= report_start,
            Patient.created_at < report_end,
        ).count(),
        appointment_count=appointments.count(),
        completed_consultations=appointments.filter(Appointment.status == "completed").count(),
        cancelled_appointments=appointments.filter(Appointment.status == "cancelled").count(),
        pending_bills=bills.filter(Billing.status == "pending").count(),
        paid_bills=bills.filter(Billing.status == "paid").count(),
        revenue_summary=Decimal(revenue or 0),
        total_appointment_count=db.query(Appointment).count(),
        total_completed_consultations=db.query(Appointment).filter(
            Appointment.status == "completed",
        ).count(),
        total_paid_bills=db.query(Billing).filter(Billing.status == "paid").count(),
        total_revenue_summary=Decimal(total_revenue or 0),
    )


@router.get("/analytics/doctors", response_model=List[DoctorWorkload])
def get_doctor_analytics(
    target_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    rows = []
    for doctor in db.query(Doctor).order_by(Doctor.name):
        base = db.query(Appointment).filter(Appointment.doctor_id == doctor.id)
        if target_date:
            base = base.filter(Appointment.appt_date == target_date)
        rows.append(DoctorWorkload(
            doctor_id=doctor.id,
            name=doctor.name,
            appointments_completed=base.filter(Appointment.status == "completed").count(),
            appointments_pending=base.filter(
                Appointment.status.in_(PENDING_APPOINTMENT_STATUSES),
            ).count(),
        ))
    return rows


@router.get("/analytics/departments", response_model=List[DepartmentStats])
def get_department_analytics(
    target_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    rows = []
    for department in db.query(Department).order_by(Department.name):
        doctor_ids = [
            row[0]
            for row in db.query(Doctor.id).filter(Doctor.department_id == department.department_id)
        ]
        appointments = db.query(Appointment).filter(Appointment.doctor_id.in_(doctor_ids))
        if target_date:
            appointments = appointments.filter(Appointment.appt_date == target_date)
        appointment_count = appointments.count() if doctor_ids else 0
        rows.append(DepartmentStats(
            department_id=department.department_id,
            name=department.name,
            doctor_count=len(doctor_ids),
            appointment_count=appointment_count,
        ))
    return rows
