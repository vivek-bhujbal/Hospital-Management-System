from datetime import date, datetime
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_exact_role, require_permission
from app.core.permissions import Permission
from app.core.roles import UserRole
from app.database import get_db
from app.models.all_models import Appointment, Billing, Department, Doctor, Employee, Patient, User
from app.schemas.all_schemas import (
    ApptStatusEnum,
    DailyReport,
    DepartmentResponse,
    DepartmentStats,
    DoctorWorkload,
    ManagerAppointment,
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


def _availability(*, active: bool, shift_start=None, shift_end=None) -> str:
    if not active:
        return "Unavailable"
    now = datetime.now().time()
    if shift_start and now < shift_start:
        return "Off shift"
    if shift_end and now >= shift_end:
        return "Off shift"
    return "Available"


@router.get("/overview", response_model=ManagerOverview)
def get_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    today = date.today()
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
        total_patients=db.query(Patient).count(),
        active_doctors=active_doctors,
        active_staff=active_staff,
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
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.patients_view)),
):
    today = date.today()
    result = []
    for patient in db.query(Patient).order_by(Patient.name):
        appointments = db.query(Appointment).filter(Appointment.patient_id == patient.id)
        last_date = appointments.filter(Appointment.appt_date <= today).with_entities(
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
            appointment_count=appointments.count(),
            last_appointment_date=last_date,
            next_appointment_date=next_date,
        ))
    return result


@router.get("/doctors", response_model=List[ManagerDoctor])
def get_doctors(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.doctors_view)),
):
    today = date.today()
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
    users = db.query(User).filter(User.role.in_(OPERATIONAL_STAFF_ROLES)).order_by(User.name).all()
    for user in users:
        employee = None
        if user.role == UserRole.receptionist.value:
            employee = db.query(Employee).filter(Employee.user_id == user.id).first()
        active = bool(user.is_active) and (not employee or employee.status == "active")
        result.append(ManagerStaff(
            id=user.id,
            name=user.name,
            role=user.role,
            designation=employee.designation if employee else user.role.replace("_", " ").title(),
            department_name=None,
            shift_start=employee.shift_start if employee else None,
            shift_end=employee.shift_end if employee else None,
            status="active" if active else "inactive",
            availability=_availability(
                active=active,
                shift_start=employee.shift_start if employee else None,
                shift_end=employee.shift_end if employee else None,
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
    report_date = target_date or date.today()
    appointments = db.query(Appointment).filter(Appointment.appt_date == report_date)
    bills = db.query(Billing).filter(func.date(Billing.created_at) == report_date)
    revenue = db.query(func.coalesce(func.sum(Billing.amount), 0)).filter(
        func.date(Billing.paid_at) == report_date,
        Billing.status == "paid",
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
            appointments_pending=base.filter(
                Appointment.status.in_(PENDING_APPOINTMENT_STATUSES),
            ).count(),
        ))
    return rows


@router.get("/analytics/departments", response_model=List[DepartmentStats])
def get_department_analytics(
    db: Session = Depends(get_db),
    _: User = Depends(require_permission(Permission.reports_view)),
):
    rows = []
    for department in db.query(Department).order_by(Department.name):
        doctor_ids = [
            row[0]
            for row in db.query(Doctor.id).filter(Doctor.department_id == department.department_id)
        ]
        appointment_count = db.query(Appointment).filter(
            Appointment.doctor_id.in_(doctor_ids),
        ).count() if doctor_ids else 0
        rows.append(DepartmentStats(
            department_id=department.department_id,
            name=department.name,
            doctor_count=len(doctor_ids),
            appointment_count=appointment_count,
        ))
    return rows
