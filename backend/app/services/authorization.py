from typing import Set

from sqlalchemy.orm import Session

from app.core.permissions import (
    ALL_PERMISSIONS,
    LEGACY_RECEPTIONIST_PERMISSION_MAP,
    PermissionLike,
    get_role_permissions,
    permission_value,
)
from app.core.roles import UserRole, inherited_roles
from app.models.all_models import Employee, EmployeePermission, RolePermission, User


def get_effective_permissions(user: User, db: Session) -> Set[str]:
    if not user.is_active:
        return set()

    permissions = get_role_permissions(user.role)
    dynamic_permissions = (
        db.query(RolePermission.permission)
        .filter(RolePermission.role.in_(inherited_roles(user.role)))
        .all()
    )
    permissions.update(
        permission for (permission,) in dynamic_permissions
        if permission in ALL_PERMISSIONS
    )
    if user.role != UserRole.receptionist.value:
        return permissions

    employee = db.query(Employee).filter(Employee.user_id == user.id).first()
    if not employee or employee.status != "active":
        return set()

    overrides = (
        db.query(EmployeePermission)
        .filter(EmployeePermission.employee_id == employee.id)
        .first()
    )
    if not overrides:
        return permissions

    for legacy_field, granular_permission in LEGACY_RECEPTIONIST_PERMISSION_MAP.items():
        if bool(getattr(overrides, legacy_field, 0)):
            permissions.add(granular_permission)
        else:
            permissions.discard(granular_permission)

    if bool(overrides.can_schedule_appointment):
        permissions.add("appointments.update")
    else:
        permissions.discard("appointments.update")

    return permissions


def user_has_permission(user: User, permission: PermissionLike, db: Session) -> bool:
    return permission_value(permission) in get_effective_permissions(user, db)
