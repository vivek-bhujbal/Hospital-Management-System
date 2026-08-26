export const PERMISSIONS = {
  PATIENTS_VIEW_SELF: 'patients.view_self',
  PATIENTS_UPDATE_SELF: 'patients.update_self',
  PATIENTS_VIEW: 'patients.view',
  PATIENTS_CREATE: 'patients.create',
  PATIENTS_UPDATE: 'patients.update',
  PATIENTS_DELETE: 'patients.delete',
  PATIENTS_VIEW_MEDICAL_HISTORY: 'patients.view_medical_history',
  DOCTORS_VIEW: 'doctors.view',
  DOCTORS_UPDATE_SELF: 'doctors.update_self',
  DOCTORS_MANAGE: 'doctors.manage',
  APPOINTMENTS_VIEW_SELF: 'appointments.view_self',
  APPOINTMENTS_VIEW: 'appointments.view',
  APPOINTMENTS_CREATE: 'appointments.create',
  APPOINTMENTS_UPDATE: 'appointments.update',
  APPOINTMENTS_CANCEL: 'appointments.cancel',
  APPOINTMENTS_CHECKIN: 'appointments.checkin',
  CONSULTATIONS_VIEW: 'consultations.view',
  CONSULTATIONS_CREATE: 'consultations.create',
  CONSULTATIONS_UPDATE: 'consultations.update',
  PRESCRIPTIONS_CREATE: 'prescriptions.create',
  PRESCRIPTIONS_VIEW: 'prescriptions.view',
  PRESCRIPTIONS_VIEW_SELF: 'prescriptions.view_self',
  BILLING_VIEW_SELF: 'billing.view_self',
  BILLING_VIEW: 'billing.view',
  BILLING_CREATE: 'billing.create',
  BILLING_COLLECT: 'billing.collect',
  BILLING_REFUND: 'billing.refund',
  BILLING_REPORT: 'billing.report',
  PHARMACY_VIEW: 'pharmacy.view',
  PHARMACY_INVENTORY: 'pharmacy.inventory',
  PHARMACY_DISPENSE: 'pharmacy.dispense',
  PHARMACY_PURCHASE: 'pharmacy.purchase',
  LABORATORY_VIEW: 'laboratory.view',
  LABORATORY_ORDER: 'laboratory.order',
  LABORATORY_SAMPLE: 'laboratory.sample',
  LABORATORY_RESULT: 'laboratory.result',
  LABORATORY_REPORT: 'laboratory.report',
  RADIOLOGY_VIEW: 'radiology.view',
  RADIOLOGY_ORDER: 'radiology.order',
  RADIOLOGY_REPORT: 'radiology.report',
  INSURANCE_VIEW: 'insurance.view',
  INSURANCE_CREATE: 'insurance.create',
  INSURANCE_CLAIM: 'insurance.claim',
  INSURANCE_APPROVE: 'insurance.approve',
  AMBULANCE_VIEW: 'ambulance.view',
  AMBULANCE_DISPATCH: 'ambulance.dispatch',
  AMBULANCE_UPDATE_STATUS: 'ambulance.update_status',
  STAFF_VIEW: 'staff.view',
  STAFF_CREATE: 'staff.create',
  STAFF_UPDATE: 'staff.update',
  STAFF_DEACTIVATE: 'staff.deactivate',
  STAFF_MANAGE_ROLES: 'staff.manage_roles',
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  AUDIT_VIEW: 'audit.view',
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_MANAGE: 'settings.manage',
  ORGANIZATIONS_VIEW: 'organizations.view',
  ORGANIZATIONS_MANAGE: 'organizations.manage',
  FEATURES_VIEW: 'features.view',
  FEATURES_MANAGE: 'features.manage',
  DEPARTMENTS_VIEW: 'departments.view',
  DEPARTMENTS_MANAGE: 'departments.manage',
  NURSING_VIEW: 'nursing.view',
  NURSING_RECORD_VITALS: 'nursing.record_vitals',
  NURSING_RECORD_NOTES: 'nursing.record_notes',
  NURSING_MANAGE_TASKS: 'nursing.manage_tasks',
  NURSING_ASSIGN_TASKS: 'nursing.assign_tasks',
  LABORATORY_VERIFY: 'laboratory.verify',
  RADIOLOGY_VERIFY: 'radiology.verify',
  ACCOUNTING_VIEW: 'accounting.view',
  ACCOUNTING_RECORD_EXPENSE: 'accounting.record_expense',
  ACCOUNTING_CLOSE_DAY: 'accounting.close_day',
  NOTIFICATIONS_MANAGE: 'notifications.manage',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]
const PERMISSION_VALUES: ReadonlySet<string> = new Set(Object.values(PERMISSIONS))

export type UserRole =
  | 'patient'
  | 'doctor'
  | 'receptionist'
  | 'admin'
  | 'super_admin'
  | 'hospital_manager'
  | 'nurse'
  | 'pharmacist'
  | 'lab_technician'
  | 'radiologist'
  | 'accountant'
  | 'insurance_officer'
  | 'ambulance_staff'

export function hasPermission(
  permissions: readonly string[],
  permission: Permission,
): boolean {
  return permissions.includes(permission)
}

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && PERMISSION_VALUES.has(value)
}

export function hasAnyPermission(
  permissions: readonly string[],
  required: readonly Permission[],
): boolean {
  return required.some((permission) => hasPermission(permissions, permission))
}
