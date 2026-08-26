from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.deps import require_permission
from app.core.permissions import Permission
from app.core.security import get_password_hash
from app.database import get_db
from app.models.all_models import Employee, EmployeePermission, User
from app.schemas.all_schemas import (
    EmployeeCreate,
    EmployeePermissionResponse,
    EmployeePermissionUpdate,
    EmployeeResponse,
    EmployeeUpdate,
)
from app.services.audit_service import record_audit_event


router = APIRouter()
allow_staff_view = require_permission(Permission.staff_view)
allow_staff_create = require_permission(Permission.staff_create)
allow_staff_update = require_permission(Permission.staff_update)
allow_staff_deactivate = require_permission(Permission.staff_deactivate)


def _request_metadata(request: Request):
    return {
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
    }


@router.get("/", response_model=List[EmployeeResponse])
def get_employees(
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff_view),
):
    employees = db.query(Employee).all()
    for employee in employees:
        user = db.query(User).filter(User.id == employee.user_id).first()
        if user:
            employee.name = user.name
            employee.email = user.email
        employee.permissions = (
            db.query(EmployeePermission)
            .filter(EmployeePermission.employee_id == employee.id)
            .first()
        )
    return employees


@router.post("/", response_model=EmployeeResponse)
def create_employee(
    emp_in: EmployeeCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff_create),
):
    if db.query(User).filter(User.email == emp_in.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        new_user = User(
            name=emp_in.name,
            email=emp_in.email,
            password_hash=get_password_hash(emp_in.password),
            role="receptionist",
            is_active=True,
            is_email_verified=True,
        )
        db.add(new_user)
        db.flush()

        new_employee = Employee(
            user_id=new_user.id,
            designation=emp_in.designation,
            joining_date=emp_in.joining_date,
            shift_start=emp_in.shift_start,
            shift_end=emp_in.shift_end,
            status=emp_in.status.value if emp_in.status else "active",
            added_by=current_user.id,
        )
        db.add(new_employee)
        db.flush()

        default_permissions = EmployeePermission(
            employee_id=new_employee.id,
            can_register_patient=1,
            can_schedule_appointment=1,
            can_checkin_patient=1,
            can_collect_billing=1,
            can_view_reports=0,
        )
        db.add(default_permissions)
        record_audit_event(
            db,
            actor=current_user,
            action="staff.created",
            resource_type="employee",
            resource_id=str(new_employee.id),
            new_values={
                "user_id": new_user.id,
                "role": new_user.role,
                "designation": new_employee.designation,
            },
            **_request_metadata(request),
        )
        db.commit()
        db.refresh(new_employee)
    except Exception:
        db.rollback()
        raise

    new_employee.permissions = default_permissions
    new_employee.name = new_user.name
    new_employee.email = new_user.email
    return new_employee


@router.patch("/{id}", response_model=EmployeeResponse)
def update_employee(
    id: int,
    emp_update: EmployeeUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff_update),
):
    employee = db.query(Employee).filter(Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    old_values = {
        "designation": employee.designation,
        "shift_start": employee.shift_start,
        "shift_end": employee.shift_end,
        "status": employee.status,
    }
    update_data = emp_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(employee, key, value.value if hasattr(value, "value") else value)

    user = db.query(User).filter(User.id == employee.user_id).first()
    if user and "status" in update_data:
        user.is_active = employee.status == "active"

    record_audit_event(
        db,
        actor=current_user,
        action="staff.updated",
        resource_type="employee",
        resource_id=str(employee.id),
        old_values=old_values,
        new_values=update_data,
        **_request_metadata(request),
    )
    db.commit()
    db.refresh(employee)

    if user:
        employee.name = user.name
        employee.email = user.email
    employee.permissions = (
        db.query(EmployeePermission)
        .filter(EmployeePermission.employee_id == employee.id)
        .first()
    )
    return employee


@router.delete("/{id}")
def delete_employee(
    id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff_deactivate),
):
    employee = db.query(Employee).filter(Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    old_status = employee.status
    employee.status = "inactive"
    linked_user = db.query(User).filter(User.id == employee.user_id).first()
    if linked_user:
        linked_user.is_active = False
    record_audit_event(
        db,
        actor=current_user,
        action="staff.deactivated",
        resource_type="employee",
        resource_id=str(employee.id),
        old_values={"status": old_status},
        new_values={"status": "inactive"},
        **_request_metadata(request),
    )
    db.commit()
    return {"status": "deactivated"}


@router.patch("/{id}/permissions", response_model=EmployeePermissionResponse)
def update_permissions(
    id: int,
    perms_update: EmployeePermissionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(allow_staff_update),
):
    employee = db.query(Employee).filter(Employee.id == id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    permissions = (
        db.query(EmployeePermission)
        .filter(EmployeePermission.employee_id == employee.id)
        .first()
    )
    if not permissions:
        raise HTTPException(status_code=404, detail="Permissions not found")

    update_data = perms_update.model_dump(exclude_unset=True)
    old_values = {
        key: bool(getattr(permissions, key)) for key in update_data
    }
    for key, value in update_data.items():
        setattr(permissions, key, 1 if value else 0)

    record_audit_event(
        db,
        actor=current_user,
        action="staff.permissions.updated",
        resource_type="employee_permission",
        resource_id=str(permissions.id),
        old_values=old_values,
        new_values=update_data,
        **_request_metadata(request),
    )
    db.commit()
    db.refresh(permissions)
    return permissions
