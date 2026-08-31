'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { logoutAction } from '@/app/actions/auth'
import {
  hasPermission,
  Permission,
  PERMISSIONS,
  UserRole,
} from '@/lib/permissions'
import { ROLE_HOME } from '@/lib/roleRoutes'

interface SidebarProps {
  role: UserRole
  portalRole?: UserRole
  permissions?: readonly Permission[]
}

interface MenuItem {
  name: string
  path: string
  permission?: Permission
}

const MENU_ITEMS: Record<UserRole, readonly MenuItem[]> = {
  patient: [
    { name: 'Home', path: '/patient/home' },
    { name: 'Appointments', path: '/patient/appointments', permission: PERMISSIONS.APPOINTMENTS_VIEW_SELF },
    { name: 'Prescriptions', path: '/patient/prescriptions', permission: PERMISSIONS.PRESCRIPTIONS_VIEW_SELF },
    { name: 'Billing', path: '/patient/billing', permission: PERMISSIONS.BILLING_VIEW_SELF },
    { name: 'Profile', path: '/patient/profile', permission: PERMISSIONS.PATIENTS_VIEW_SELF },
  ],
  receptionist: [
    { name: 'Dashboard', path: '/receptionist/home' },
    { name: 'Patients', path: '/receptionist/patients', permission: PERMISSIONS.PATIENTS_VIEW },
    { name: 'Register Patient', path: '/receptionist/register-patient', permission: PERMISSIONS.PATIENTS_CREATE },
    { name: 'Schedule Appointment', path: '/receptionist/schedule', permission: PERMISSIONS.APPOINTMENTS_CREATE },
    { name: "Today's Queue", path: '/receptionist/queue', permission: PERMISSIONS.APPOINTMENTS_VIEW },
    { name: 'Billing', path: '/receptionist/billing', permission: PERMISSIONS.BILLING_COLLECT },
  ],
  doctor: [
    { name: 'Dashboard', path: '/doctor/home' },
    { name: 'Appointments', path: '/doctor/appointments', permission: PERMISSIONS.APPOINTMENTS_VIEW },
    { name: 'Patients', path: '/doctor/patients', permission: PERMISSIONS.PATIENTS_VIEW },
    { name: 'Consultation', path: '/doctor/consultation', permission: PERMISSIONS.CONSULTATIONS_CREATE },
    { name: 'Profile', path: '/doctor/profile', permission: PERMISSIONS.DOCTORS_UPDATE_SELF },
  ],
  admin: [
    { name: 'Dashboard', path: '/admin/home', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Doctors', path: '/admin/doctors', permission: PERMISSIONS.DOCTORS_VIEW },
    { name: 'Employees', path: '/admin/employees', permission: PERMISSIONS.STAFF_VIEW },
    { name: 'Staff Accounts', path: '/admin/staff', permission: PERMISSIONS.STAFF_CREATE },
    { name: 'Patients', path: '/admin/patients', permission: PERMISSIONS.PATIENTS_VIEW },
    { name: 'Appointments', path: '/admin/appointments', permission: PERMISSIONS.APPOINTMENTS_VIEW },
    { name: 'Billing', path: '/admin/billing', permission: PERMISSIONS.BILLING_REPORT },
  ],
  super_admin: [
    { name: 'Dashboard', path: '/super-admin/home' },
    { name: 'Admin management', path: '/super-admin/admins', permission: PERMISSIONS.STAFF_MANAGE_ROLES },
    { name: 'Hospitals', path: '/super-admin/hospitals', permission: PERMISSIONS.ORGANIZATIONS_MANAGE },
    { name: 'Roles', path: '/super-admin/roles', permission: PERMISSIONS.STAFF_MANAGE_ROLES },
    { name: 'Role grants', path: '/super-admin/permissions', permission: PERMISSIONS.STAFF_MANAGE_ROLES },
    { name: 'System settings', path: '/super-admin/settings', permission: PERMISSIONS.SETTINGS_MANAGE },
    { name: 'Feature flags', path: '/super-admin/features', permission: PERMISSIONS.FEATURES_MANAGE },
    { name: 'Audit logs', path: '/super-admin/audit-logs' },
    { name: 'System health', path: '/super-admin/system-health' },
  ],
  hospital_manager: [
    { name: 'Dashboard', path: '/manager/home' },
    { name: 'Appointments', path: '/manager/appointments', permission: PERMISSIONS.APPOINTMENTS_VIEW },
    { name: 'Patients', path: '/manager/patients', permission: PERMISSIONS.PATIENTS_VIEW },
    { name: 'Doctors', path: '/manager/doctors', permission: PERMISSIONS.DOCTORS_VIEW },
    { name: 'Staff', path: '/manager/staff', permission: PERMISSIONS.STAFF_VIEW },
    { name: 'Reports', path: '/manager/reports', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Departments', path: '/manager/departments', permission: PERMISSIONS.DEPARTMENTS_VIEW },
  ],
  nurse: [
    { name: 'Dashboard', path: '/nurse/home' },
    { name: 'Patients', path: '/nurse/patients', permission: PERMISSIONS.NURSING_VIEW },
    { name: 'Appointments', path: '/nurse/appointments', permission: PERMISSIONS.NURSING_VIEW },
    { name: 'Vitals', path: '/nurse/vitals', permission: PERMISSIONS.NURSING_RECORD_VITALS },
    { name: 'Nursing Tasks', path: '/nurse/tasks', permission: PERMISSIONS.NURSING_MANAGE_TASKS },
  ],
  pharmacist: [
    { name: 'Dashboard', path: '/pharmacist/home' },
    { name: 'Prescriptions', path: '/pharmacist/prescriptions', permission: PERMISSIONS.PHARMACY_VIEW },
    { name: 'Dispensing', path: '/pharmacist/dispensing', permission: PERMISSIONS.PHARMACY_DISPENSE },
    { name: 'Inventory', path: '/pharmacist/inventory', permission: PERMISSIONS.PHARMACY_INVENTORY },
  ],
  lab_technician: [
    { name: 'Dashboard', path: '/lab/home' },
    { name: 'Lab Orders', path: '/lab/orders', permission: PERMISSIONS.LABORATORY_VIEW },
    { name: 'Results', path: '/lab/results', permission: PERMISSIONS.LABORATORY_RESULT },
  ],
  radiologist: [
    { name: 'Home', path: '/radiology/home' },
    { name: 'Orders', path: '/radiology/orders', permission: PERMISSIONS.RADIOLOGY_VIEW },
    { name: 'Studies', path: '/radiology/studies', permission: PERMISSIONS.RADIOLOGY_VIEW },
    { name: 'Reports', path: '/radiology/reports', permission: PERMISSIONS.RADIOLOGY_REPORT },
  ],
  accountant: [
    { name: 'Home', path: '/accountant/home' },
    { name: 'Billing', path: '/accountant/billing', permission: PERMISSIONS.BILLING_VIEW },
    { name: 'Transactions', path: '/accountant/transactions', permission: PERMISSIONS.ACCOUNTING_VIEW },
    { name: 'Expenses', path: '/accountant/expenses', permission: PERMISSIONS.ACCOUNTING_RECORD_EXPENSE },
    { name: 'Refunds', path: '/accountant/refunds', permission: PERMISSIONS.BILLING_REFUND },
    { name: 'Reports', path: '/accountant/reports', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Daily closing', path: '/accountant/daily-closing', permission: PERMISSIONS.ACCOUNTING_CLOSE_DAY },
  ],
  insurance_officer: [
    { name: 'Home', path: '/insurance/home' },
    { name: 'Providers', path: '/insurance/providers', permission: PERMISSIONS.INSURANCE_VIEW },
    { name: 'Policies', path: '/insurance/policies', permission: PERMISSIONS.INSURANCE_CREATE },
    { name: 'Claims', path: '/insurance/claims', permission: PERMISSIONS.INSURANCE_CLAIM },
    { name: 'Documents', path: '/insurance/documents', permission: PERMISSIONS.INSURANCE_CLAIM },
    { name: 'Payments', path: '/insurance/payments', permission: PERMISSIONS.INSURANCE_APPROVE },
  ],
  ambulance_staff: [
    { name: 'Home', path: '/ambulance/home' },
    { name: 'Requests', path: '/ambulance/requests', permission: PERMISSIONS.AMBULANCE_VIEW },
    { name: 'Trips', path: '/ambulance/trips', permission: PERMISSIONS.AMBULANCE_UPDATE_STATUS },
    { name: 'Vehicle', path: '/ambulance/vehicle', permission: PERMISSIONS.AMBULANCE_VIEW },
  ],
}

export default function Sidebar({ role, portalRole = role, permissions = [] }: SidebarProps) {
  const pathname = usePathname()
  const portalItems = MENU_ITEMS[portalRole].filter(
    (item) => !item.permission || hasPermission(permissions, item.permission),
  )
  const items = portalRole === role
    ? portalItems
    : [{ name: 'Back to my portal', path: ROLE_HOME[role] }, ...portalItems]

  return (
    <aside className="w-64 h-full bg-[#0A192F] text-white flex flex-col shadow-lg">
      <div className="p-6 text-2xl font-bold border-b border-gray-700 tracking-wide">
        HMS Portal
      </div>
      <nav className="flex-1 mt-6 overflow-y-auto">
        <ul className="space-y-2 px-4">
          {items.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`)
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`block px-4 py-3 rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white font-medium shadow-md'
                      : 'text-gray-300 hover:bg-[#112240] hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => logoutAction()}
          className="w-full text-left px-4 py-2 mb-4 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors duration-200 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
        <div className="text-sm text-gray-500 text-center">
          Role: <span className="capitalize text-gray-400">{role.replaceAll('_', ' ')}</span>
        </div>
      </div>
    </aside>
  )
}
