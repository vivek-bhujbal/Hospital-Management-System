from enum import Enum
from typing import Iterable, Set, Union


class UserRole(str, Enum):
    patient = "patient"
    doctor = "doctor"
    receptionist = "receptionist"
    admin = "admin"
    super_admin = "super_admin"
    hospital_manager = "hospital_manager"
    nurse = "nurse"
    pharmacist = "pharmacist"
    lab_technician = "lab_technician"
    radiologist = "radiologist"
    accountant = "accountant"
    insurance_officer = "insurance_officer"
    ambulance_staff = "ambulance_staff"


RoleLike = Union[UserRole, str]
ROLE_VALUES = tuple(role.value for role in UserRole)

# Only administrative roles inherit. Operational roles are intentionally absent.
ROLE_PARENTS = {
    UserRole.admin.value: UserRole.hospital_manager.value,
    UserRole.super_admin.value: UserRole.admin.value,
}


def normalize_role(role: RoleLike) -> str:
    value = role.value if isinstance(role, UserRole) else str(role)
    if value not in ROLE_VALUES:
        raise ValueError(f"Unknown role: {value}")
    return value


def inherited_roles(role: RoleLike) -> Set[str]:
    current = normalize_role(role)
    roles = {current}
    while current in ROLE_PARENTS:
        current = ROLE_PARENTS[current]
        roles.add(current)
    return roles


def role_satisfies(actual_role: RoleLike, required_role: RoleLike) -> bool:
    return normalize_role(required_role) in inherited_roles(actual_role)


def role_satisfies_any(actual_role: RoleLike, required_roles: Iterable[RoleLike]) -> bool:
    actual_roles = inherited_roles(actual_role)
    return any(normalize_role(role) in actual_roles for role in required_roles)
