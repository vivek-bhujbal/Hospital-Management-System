import type { UserRole } from './permissions'

export const ROLE_HOME: Record<UserRole, string> = {
  patient: '/patient/home',
  doctor: '/doctor/home',
  receptionist: '/receptionist/home',
  admin: '/admin/home',
  super_admin: '/super-admin/home',
  hospital_manager: '/manager/home',
  nurse: '/nurse/home',
  pharmacist: '/pharmacist/home',
  lab_technician: '/lab/home',
  radiologist: '/radiologist/home',
  accountant: '/accountant/home',
  insurance_officer: '/insurance/home',
  ambulance_staff: '/ambulance/home',
}

const ROLE_VALUES: ReadonlySet<string> = new Set(Object.keys(ROLE_HOME))
const RECEPTIONIST_ROUTES: ReadonlySet<string> = new Set([
  '/receptionist/home',
  '/receptionist/patients',
  '/receptionist/register-patient',
  '/receptionist/schedule',
  '/receptionist/queue',
  '/receptionist/billing',
])
const DOCTOR_ROUTES: ReadonlySet<string> = new Set([
  '/doctor/home',
  '/doctor/appointments',
  '/doctor/patients',
  '/doctor/consultation',
  '/doctor/profile',
])
const MANAGER_ROUTES: ReadonlySet<string> = new Set([
  '/manager/home',
  '/manager/appointments',
  '/manager/patients',
  '/manager/doctors',
  '/manager/staff',
  '/manager/reports',
  '/manager/departments',
])
const NURSE_ROUTES: ReadonlySet<string> = new Set([
  '/nurse/home',
  '/nurse/patients',
  '/nurse/appointments',
  '/nurse/vitals',
  '/nurse/tasks',
])
const PHARMACIST_ROUTES: ReadonlySet<string> = new Set([
  '/pharmacist/home',
  '/pharmacist/prescriptions',
  '/pharmacist/inventory',
  '/pharmacist/dispensing',
])
const LAB_TECHNICIAN_ROUTES: ReadonlySet<string> = new Set([
  '/lab/home',
  '/lab/orders',
  '/lab/results',
])
const RADIOLOGIST_ROUTES: ReadonlySet<string> = new Set([
  '/radiologist/home',
  '/radiologist/orders',
  '/radiologist/reports',
])
const ACCOUNTANT_ROUTES: ReadonlySet<string> = new Set([
  '/accountant/home',
  '/accountant/invoices',
  '/accountant/payments',
  '/accountant/expenses',
  '/accountant/reports',
])
const INSURANCE_ROUTES: ReadonlySet<string> = new Set([
  '/insurance/home',
  '/insurance/patients',
  '/insurance/claims',
  '/insurance/approvals',
])
const AMBULANCE_ROUTES: ReadonlySet<string> = new Set([
  '/ambulance/home',
  '/ambulance/requests',
  '/ambulance/trips',
  '/ambulance/vehicles',
])
const PORTAL_ROLES: readonly (readonly [string, UserRole])[] = [
  ['/patient', 'patient'],
  ['/doctor', 'doctor'],
  ['/receptionist', 'receptionist'],
  ['/admin', 'admin'],
  ['/super-admin', 'super_admin'],
  ['/manager', 'hospital_manager'],
  ['/nurse', 'nurse'],
  ['/pharmacist', 'pharmacist'],
  ['/lab', 'lab_technician'],
  ['/radiologist', 'radiologist'],
  ['/accountant', 'accountant'],
  ['/insurance', 'insurance_officer'],
  ['/ambulance', 'ambulance_staff'],
]

function isDoctorRoute(pathname: string): boolean {
  return DOCTOR_ROUTES.has(pathname) || /^\/doctor\/patients\/\d+$/.test(pathname)
}

function isNurseRoute(pathname: string): boolean {
  return NURSE_ROUTES.has(pathname) || /^\/nurse\/patient\/\d+$/.test(pathname)
}

function isPharmacistRoute(pathname: string): boolean {
  return PHARMACIST_ROUTES.has(pathname) || /^\/pharmacist\/prescriptions\/\d+$/.test(pathname)
}

function isLabTechnicianRoute(pathname: string): boolean {
  return LAB_TECHNICIAN_ROUTES.has(pathname) || /^\/lab\/orders\/\d+$/.test(pathname)
}

function isRadiologistRoute(pathname: string): boolean {
  return RADIOLOGIST_ROUTES.has(pathname) || /^\/radiologist\/orders\/\d+$/.test(pathname)
}

function isInsuranceRoute(pathname: string): boolean {
  return INSURANCE_ROUTES.has(pathname) || /^\/insurance\/claims\/\d+$/.test(pathname)
}

function isAmbulanceRoute(pathname: string): boolean {
  return AMBULANCE_ROUTES.has(pathname) || /^\/ambulance\/requests\/\d+$/.test(pathname)
}

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
  if (pathname === '/pharmacy' || pathname.startsWith('/pharmacy/')
      || pathname === '/radiology' || pathname.startsWith('/radiology/')) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  const isReceptionistPath = pathname === '/receptionist' || pathname.startsWith('/receptionist/')
  const isDoctorPath = pathname === '/doctor' || pathname.startsWith('/doctor/')
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/')
  const isSuperAdminPath = pathname === '/super-admin' || pathname.startsWith('/super-admin/')

  const portal = PORTAL_ROLES.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (portal) {
    if (!isUserRole(role)) return '/login'
    if (role !== portal[1]) return ROLE_HOME[role]
  }

  if ((isReceptionistPath || isDoctorPath || isAdminPath || isSuperAdminPath) && !isUserRole(role)) {
    return '/login'
  }
  if ((pathname === '/receptionist' || pathname.startsWith('/receptionist/'))
      && !RECEPTIONIST_ROUTES.has(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if (isDoctorPath && !isDoctorRoute(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if ((pathname === '/manager' || pathname.startsWith('/manager/')) && !MANAGER_ROUTES.has(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if ((pathname === '/nurse' || pathname.startsWith('/nurse/')) && !isNurseRoute(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if ((pathname === '/pharmacist' || pathname.startsWith('/pharmacist/')) && !isPharmacistRoute(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if ((pathname === '/lab' || pathname.startsWith('/lab/')) && !isLabTechnicianRoute(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if ((pathname === '/radiologist' || pathname.startsWith('/radiologist/')) && !isRadiologistRoute(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if ((pathname === '/accountant' || pathname.startsWith('/accountant/')) && !ACCOUNTANT_ROUTES.has(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if ((pathname === '/insurance' || pathname.startsWith('/insurance/')) && !isInsuranceRoute(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if ((pathname === '/ambulance' || pathname.startsWith('/ambulance/')) && !isAmbulanceRoute(pathname)) {
    return isUserRole(role) ? ROLE_HOME[role] : '/login'
  }
  if (!isUserRole(role)) return null
  if (isReceptionistPath) {
    if (role !== 'receptionist') return ROLE_HOME[role]
  }
  if (isDoctorPath && role !== 'doctor') {
    return ROLE_HOME[role]
  }
  if (isSuperAdminPath && role !== 'super_admin') {
    return ROLE_HOME[role]
  }
  if (isAdminPath && role !== 'admin') {
    return ROLE_HOME[role]
  }
  return null
}
