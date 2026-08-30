import type { UserRole } from './permissions'

export const ROLE_HOME: Record<UserRole, string> = {
  patient: '/patient/home',
  doctor: '/doctor/home',
  receptionist: '/receptionist/home',
  admin: '/admin/home',
  super_admin: '/super-admin/home',
  hospital_manager: '/manager/home',
  nurse: '/nurse/home',
  pharmacist: '/pharmacy/home',
  lab_technician: '/lab/home',
  radiologist: '/radiology/home',
  accountant: '/accountant/home',
  insurance_officer: '/insurance/home',
  ambulance_staff: '/ambulance/home',
}

const ROLE_VALUES: ReadonlySet<string> = new Set(Object.keys(ROLE_HOME))

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && ROLE_VALUES.has(value)
}

export function roleHome(role: unknown): string {
  return isUserRole(role) ? ROLE_HOME[role] : '/login'
}

export function protectedPortalRedirect(
  pathname: string,
  role: unknown,
): string | null {
  if (!isUserRole(role)) return null
  if ((pathname === '/super-admin' || pathname.startsWith('/super-admin/')) && role !== 'super_admin') {
    return ROLE_HOME[role]
  }
  if ((pathname === '/admin' || pathname.startsWith('/admin/')) && role !== 'admin') {
    return ROLE_HOME[role]
  }
  return null
}
