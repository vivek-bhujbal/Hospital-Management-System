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
    { name: 'Home', path: '/receptionist/home' },
    { name: 'Register patient', path: '/receptionist/register-patient', permission: PERMISSIONS.PATIENTS_CREATE },
    { name: 'Schedule', path: '/receptionist/schedule', permission: PERMISSIONS.APPOINTMENTS_CREATE },
    { name: 'Check-in queue', path: '/receptionist/queue', permission: PERMISSIONS.APPOINTMENTS_CHECKIN },
    { name: 'Billing', path: '/receptionist/billing', permission: PERMISSIONS.BILLING_COLLECT },
  ],
  doctor: [
    { name: 'Home', path: '/doctor/home' },
    { name: 'Appointments', path: '/doctor/appointments', permission: PERMISSIONS.APPOINTMENTS_VIEW },
    { name: 'Patients', path: '/doctor/patients', permission: PERMISSIONS.PATIENTS_VIEW },
    { name: 'Consultation', path: '/doctor/consultation', permission: PERMISSIONS.CONSULTATIONS_CREATE },
    { name: 'Profile', path: '/doctor/profile', permission: PERMISSIONS.DOCTORS_UPDATE_SELF },
  ],
  admin: [
    { name: 'Home', path: '/admin/home', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Doctors', path: '/admin/doctors', permission: PERMISSIONS.DOCTORS_VIEW },
    { name: 'Employees', path: '/admin/employees', permission: PERMISSIONS.STAFF_VIEW },
    { name: 'Staff accounts', path: '/admin/staff', permission: PERMISSIONS.STAFF_CREATE },
    { name: 'Patients', path: '/admin/patients', permission: PERMISSIONS.PATIENTS_VIEW },
    { name: 'Appointments', path: '/admin/appointments', permission: PERMISSIONS.APPOINTMENTS_VIEW },
    { name: 'Billing', path: '/admin/billing', permission: PERMISSIONS.BILLING_REPORT },
    { name: 'Manager portal', path: '/manager/home', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Nursing', path: '/nurse/home', permission: PERMISSIONS.NURSING_VIEW },
    { name: 'Pharmacy', path: '/pharmacy/home', permission: PERMISSIONS.PHARMACY_VIEW },
    { name: 'Laboratory', path: '/lab/home', permission: PERMISSIONS.LABORATORY_VIEW },
    { name: 'Radiology', path: '/radiology/home', permission: PERMISSIONS.RADIOLOGY_VIEW },
    { name: 'Accounting', path: '/accountant/home', permission: PERMISSIONS.ACCOUNTING_VIEW },
    { name: 'Insurance', path: '/insurance/home', permission: PERMISSIONS.INSURANCE_VIEW },
    { name: 'Ambulance', path: '/ambulance/home', permission: PERMISSIONS.AMBULANCE_VIEW },
  ],
  super_admin: [
    { name: 'Home', path: '/super-admin/home' },
    { name: 'Organizations', path: '/super-admin/hospitals', permission: PERMISSIONS.ORGANIZATIONS_VIEW },
    { name: 'Administrators', path: '/super-admin/admins', permission: PERMISSIONS.STAFF_VIEW },
    { name: 'Staff accounts', path: '/admin/staff', permission: PERMISSIONS.STAFF_CREATE },
    { name: 'Role grants', path: '/super-admin/permissions', permission: PERMISSIONS.STAFF_MANAGE_ROLES },
    { name: 'Settings', path: '/super-admin/settings', permission: PERMISSIONS.SETTINGS_MANAGE },
    { name: 'Feature flags', path: '/super-admin/features', permission: PERMISSIONS.FEATURES_MANAGE },
    { name: 'Audit logs', path: '/super-admin/audit-logs', permission: PERMISSIONS.AUDIT_VIEW },
    { name: 'System health', path: '/super-admin/system-health' },
    { name: 'Admin portal', path: '/admin/home', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Manager portal', path: '/manager/home', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Nursing', path: '/nurse/home', permission: PERMISSIONS.NURSING_VIEW },
    { name: 'Pharmacy', path: '/pharmacy/home', permission: PERMISSIONS.PHARMACY_VIEW },
    { name: 'Laboratory', path: '/lab/home', permission: PERMISSIONS.LABORATORY_VIEW },
    { name: 'Radiology', path: '/radiology/home', permission: PERMISSIONS.RADIOLOGY_VIEW },
    { name: 'Accounting', path: '/accountant/home', permission: PERMISSIONS.ACCOUNTING_VIEW },
    { name: 'Insurance', path: '/insurance/home', permission: PERMISSIONS.INSURANCE_VIEW },
    { name: 'Ambulance', path: '/ambulance/home', permission: PERMISSIONS.AMBULANCE_VIEW },
  ],
  hospital_manager: [
    { name: 'Home', path: '/manager/home' },
    { name: 'Departments', path: '/manager/departments', permission: PERMISSIONS.DEPARTMENTS_VIEW },
    { name: 'Doctors', path: '/manager/doctors', permission: PERMISSIONS.DOCTORS_VIEW },
    { name: 'Staff', path: '/manager/staff', permission: PERMISSIONS.STAFF_VIEW },
    { name: 'Appointments', path: '/manager/appointments', permission: PERMISSIONS.APPOINTMENTS_VIEW },
    { name: 'Reports', path: '/manager/reports', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Analytics', path: '/manager/analytics', permission: PERMISSIONS.REPORTS_VIEW },
    { name: 'Nursing', path: '/nurse/home', permission: PERMISSIONS.NURSING_VIEW },
    { name: 'Pharmacy', path: '/pharmacy/home', permission: PERMISSIONS.PHARMACY_VIEW },
    { name: 'Laboratory', path: '/lab/home', permission: PERMISSIONS.LABORATORY_VIEW },
    { name: 'Radiology', path: '/radiology/home', permission: PERMISSIONS.RADIOLOGY_VIEW },
    { name: 'Accounting', path: '/accountant/home', permission: PERMISSIONS.ACCOUNTING_VIEW },
    { name: 'Insurance', path: '/insurance/home', permission: PERMISSIONS.INSURANCE_VIEW },
    { name: 'Ambulance', path: '/ambulance/home', permission: PERMISSIONS.AMBULANCE_VIEW },
  ],
  nurse: [
    { name: 'Home', path: '/nurse/home' },
    { name: 'Assigned patients', path: '/nurse/patients', permission: PERMISSIONS.NURSING_VIEW },
    { name: 'Record vitals', path: '/nurse/vitals', permission: PERMISSIONS.NURSING_RECORD_VITALS },
    { name: 'My tasks', path: '/nurse/tasks', permission: PERMISSIONS.NURSING_MANAGE_TASKS },
    { name: 'Nursing notes', path: '/nurse/notes', permission: PERMISSIONS.NURSING_RECORD_NOTES },
  ],
  pharmacist: [
    { name: 'Home', path: '/pharmacy/home' },
    { name: 'Prescriptions', path: '/pharmacy/prescriptions', permission: PERMISSIONS.PHARMACY_VIEW },
    { name: 'Dispensing', path: '/pharmacy/dispensing', permission: PERMISSIONS.PHARMACY_DISPENSE },
    { name: 'Medicines', path: '/pharmacy/medicines', permission: PERMISSIONS.PHARMACY_INVENTORY },
    { name: 'Inventory', path: '/pharmacy/inventory', permission: PERMISSIONS.PHARMACY_INVENTORY },
    { name: 'Purchases', path: '/pharmacy/purchases', permission: PERMISSIONS.PHARMACY_PURCHASE },
    { name: 'Suppliers', path: '/pharmacy/suppliers', permission: PERMISSIONS.PHARMACY_PURCHASE },
    { name: 'Alerts', path: '/pharmacy/alerts', permission: PERMISSIONS.PHARMACY_INVENTORY },
  ],
  lab_technician: [
    { name: 'Home', path: '/lab/home' },
    { name: 'Orders', path: '/lab/orders', permission: PERMISSIONS.LABORATORY_VIEW },
    { name: 'Samples', path: '/lab/samples', permission: PERMISSIONS.LABORATORY_SAMPLE },
    { name: 'Results', path: '/lab/results', permission: PERMISSIONS.LABORATORY_RESULT },
    { name: 'Reports', path: '/lab/reports', permission: PERMISSIONS.LABORATORY_REPORT },
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

const ROLE_HOME: Record<UserRole, string> = {
  patient: '/patient/home', doctor: '/doctor/home', receptionist: '/receptionist/home',
  admin: '/admin/home', super_admin: '/super-admin/home', hospital_manager: '/manager/home',
  nurse: '/nurse/home', pharmacist: '/pharmacy/home', lab_technician: '/lab/home',
  radiologist: '/radiology/home', accountant: '/accountant/home',
  insurance_officer: '/insurance/home', ambulance_staff: '/ambulance/home',
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
            const isActive = pathname === item.path
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
