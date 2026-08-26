from enum import Enum
from typing import Dict, FrozenSet, Set, Union

from app.core.roles import ROLE_PARENTS, UserRole, normalize_role


class Permission(str, Enum):
    patients_view_self = "patients.view_self"
    patients_update_self = "patients.update_self"
    patients_view = "patients.view"
    patients_create = "patients.create"
    patients_update = "patients.update"
    patients_delete = "patients.delete"
    patients_view_medical_history = "patients.view_medical_history"

    doctors_view = "doctors.view"
    doctors_update_self = "doctors.update_self"
    doctors_manage = "doctors.manage"

    appointments_view_self = "appointments.view_self"
    appointments_view = "appointments.view"
    appointments_create = "appointments.create"
    appointments_update = "appointments.update"
    appointments_cancel = "appointments.cancel"
    appointments_checkin = "appointments.checkin"

    consultations_view = "consultations.view"
    consultations_create = "consultations.create"
    consultations_update = "consultations.update"

    prescriptions_create = "prescriptions.create"
    prescriptions_view = "prescriptions.view"
    prescriptions_view_self = "prescriptions.view_self"

    billing_view_self = "billing.view_self"
    billing_view = "billing.view"
    billing_create = "billing.create"
    billing_collect = "billing.collect"
    billing_refund = "billing.refund"
    billing_report = "billing.report"

    pharmacy_view = "pharmacy.view"
    pharmacy_inventory = "pharmacy.inventory"
    pharmacy_dispense = "pharmacy.dispense"
    pharmacy_purchase = "pharmacy.purchase"

    laboratory_view = "laboratory.view"
    laboratory_order = "laboratory.order"
    laboratory_sample = "laboratory.sample"
    laboratory_result = "laboratory.result"
    laboratory_report = "laboratory.report"

    radiology_view = "radiology.view"
    radiology_order = "radiology.order"
    radiology_report = "radiology.report"

    insurance_view = "insurance.view"
    insurance_create = "insurance.create"
    insurance_claim = "insurance.claim"
    insurance_approve = "insurance.approve"

    ambulance_view = "ambulance.view"
    ambulance_dispatch = "ambulance.dispatch"
    ambulance_update_status = "ambulance.update_status"

    staff_view = "staff.view"
    staff_create = "staff.create"
    staff_update = "staff.update"
    staff_deactivate = "staff.deactivate"
    staff_manage_roles = "staff.manage_roles"

    reports_view = "reports.view"
    reports_export = "reports.export"
    audit_view = "audit.view"
    settings_view = "settings.view"
    settings_manage = "settings.manage"

    organizations_view = "organizations.view"
    organizations_manage = "organizations.manage"
    features_view = "features.view"
    features_manage = "features.manage"
    departments_view = "departments.view"
    departments_manage = "departments.manage"

    nursing_view = "nursing.view"
    nursing_record_vitals = "nursing.record_vitals"
    nursing_record_notes = "nursing.record_notes"
    nursing_manage_tasks = "nursing.manage_tasks"
    nursing_assign_tasks = "nursing.assign_tasks"

    laboratory_verify = "laboratory.verify"
    radiology_verify = "radiology.verify"

    accounting_view = "accounting.view"
    accounting_record_expense = "accounting.record_expense"
    accounting_close_day = "accounting.close_day"

    notifications_manage = "notifications.manage"


PermissionLike = Union[Permission, str]
ALL_PERMISSIONS: FrozenSet[str] = frozenset(permission.value for permission in Permission)


def permission_value(permission: PermissionLike) -> str:
    value = permission.value if isinstance(permission, Permission) else str(permission)
    if value not in ALL_PERMISSIONS:
        raise ValueError(f"Unknown permission: {value}")
    return value


ROLE_PERMISSIONS: Dict[str, FrozenSet[str]] = {
    UserRole.patient.value: frozenset({
        Permission.patients_view_self.value,
        Permission.patients_update_self.value,
        Permission.doctors_view.value,
        Permission.appointments_view_self.value,
        Permission.appointments_create.value,
        Permission.prescriptions_view_self.value,
        Permission.billing_view_self.value,
        Permission.settings_view.value,
    }),
    UserRole.doctor.value: frozenset({
        Permission.patients_view.value,
        Permission.patients_view_medical_history.value,
        Permission.doctors_view.value,
        Permission.doctors_update_self.value,
        Permission.appointments_view.value,
        Permission.consultations_view.value,
        Permission.consultations_create.value,
        Permission.consultations_update.value,
        Permission.prescriptions_create.value,
        Permission.prescriptions_view.value,
        Permission.laboratory_order.value,
        Permission.laboratory_view.value,
        Permission.radiology_order.value,
        Permission.radiology_view.value,
        Permission.nursing_assign_tasks.value,
        Permission.settings_view.value,
    }),
    UserRole.receptionist.value: frozenset({
        Permission.patients_view.value,
        Permission.doctors_view.value,
        Permission.appointments_view.value,
        Permission.billing_view.value,
        Permission.settings_view.value,
    }),
    UserRole.hospital_manager.value: frozenset({
        Permission.patients_view.value,
        Permission.doctors_view.value,
        Permission.appointments_view.value,
        Permission.appointments_update.value,
        Permission.consultations_view.value,
        Permission.prescriptions_view.value,
        Permission.billing_view.value,
        Permission.billing_report.value,
        Permission.staff_view.value,
        Permission.staff_create.value,
        Permission.staff_update.value,
        Permission.staff_deactivate.value,
        Permission.reports_view.value,
        Permission.reports_export.value,
        Permission.audit_view.value,
        Permission.ambulance_dispatch.value,
        Permission.settings_view.value,
        Permission.organizations_view.value,
        Permission.departments_view.value,
        Permission.departments_manage.value,
        Permission.nursing_view.value,
        Permission.nursing_assign_tasks.value,
        Permission.pharmacy_view.value,
        Permission.laboratory_view.value,
        Permission.radiology_view.value,
        Permission.insurance_view.value,
        Permission.ambulance_view.value,
        Permission.accounting_view.value,
    }),
    UserRole.admin.value: frozenset({
        Permission.patients_create.value,
        Permission.patients_update.value,
        Permission.patients_delete.value,
        Permission.patients_view_medical_history.value,
        Permission.doctors_manage.value,
        Permission.appointments_create.value,
        Permission.appointments_cancel.value,
        Permission.appointments_checkin.value,
        Permission.billing_create.value,
        Permission.billing_collect.value,
        Permission.billing_refund.value,
        Permission.settings_manage.value,
        Permission.organizations_manage.value,
        Permission.features_view.value,
        Permission.notifications_manage.value,
    }),
    UserRole.super_admin.value: frozenset({
        Permission.staff_manage_roles.value,
        Permission.features_manage.value,
    }),
    UserRole.nurse.value: frozenset({
        Permission.patients_view.value,
        Permission.patients_update.value,
        Permission.patients_view_medical_history.value,
        Permission.appointments_view.value,
        Permission.consultations_view.value,
        Permission.consultations_update.value,
        Permission.prescriptions_view.value,
        Permission.nursing_view.value,
        Permission.nursing_record_vitals.value,
        Permission.nursing_record_notes.value,
        Permission.nursing_manage_tasks.value,
    }),
    UserRole.pharmacist.value: frozenset({
        Permission.patients_view.value,
        Permission.prescriptions_view.value,
        Permission.pharmacy_view.value,
        Permission.pharmacy_inventory.value,
        Permission.pharmacy_dispense.value,
        Permission.pharmacy_purchase.value,
    }),
    UserRole.lab_technician.value: frozenset({
        Permission.patients_view.value,
        Permission.laboratory_view.value,
        Permission.laboratory_sample.value,
        Permission.laboratory_result.value,
        Permission.laboratory_report.value,
        Permission.laboratory_verify.value,
    }),
    UserRole.radiologist.value: frozenset({
        Permission.patients_view.value,
        Permission.radiology_view.value,
        Permission.radiology_report.value,
        Permission.radiology_verify.value,
    }),
    UserRole.accountant.value: frozenset({
        Permission.billing_view.value,
        Permission.billing_create.value,
        Permission.billing_collect.value,
        Permission.billing_refund.value,
        Permission.billing_report.value,
        Permission.reports_view.value,
        Permission.reports_export.value,
        Permission.accounting_view.value,
        Permission.accounting_record_expense.value,
        Permission.accounting_close_day.value,
    }),
    UserRole.insurance_officer.value: frozenset({
        Permission.patients_view.value,
        Permission.billing_view.value,
        Permission.insurance_view.value,
        Permission.insurance_create.value,
        Permission.insurance_claim.value,
        Permission.insurance_approve.value,
    }),
    UserRole.ambulance_staff.value: frozenset({
        Permission.ambulance_view.value,
        Permission.ambulance_update_status.value,
    }),
}


LEGACY_RECEPTIONIST_PERMISSION_MAP = {
    "can_register_patient": Permission.patients_create.value,
    "can_schedule_appointment": Permission.appointments_create.value,
    "can_checkin_patient": Permission.appointments_checkin.value,
    "can_collect_billing": Permission.billing_collect.value,
    "can_view_reports": Permission.reports_view.value,
}


def get_role_permissions(role: str) -> Set[str]:
    current = normalize_role(role)
    permissions: Set[str] = set()
    while True:
        permissions.update(ROLE_PERMISSIONS.get(current, frozenset()))
        parent = ROLE_PARENTS.get(current)
        if not parent:
            break
        current = parent
    return permissions
