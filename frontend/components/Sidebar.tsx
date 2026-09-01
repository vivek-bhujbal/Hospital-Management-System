'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Activity, Ambulance, BarChart3, Bed, Building2, CalendarDays, ChevronLeft,
  ChevronRight, ClipboardCheck, ClipboardList, CreditCard, FileCheck2, FileHeart,
  FileText, FlaskConical, HeartPulse, Hospital, LayoutDashboard, LogOut, Microscope,
  PackageSearch, Pill, ReceiptIndianRupee, Settings, ShieldCheck, ShieldPlus,
  Stethoscope, TestTube2, UserCog, UserPlus, Users, WalletCards, X,
} from 'lucide-react'

import { logoutAction } from '@/app/actions/auth'
import { hasPermission, Permission, PERMISSIONS, UserRole } from '@/lib/permissions'
import { ROLE_HOME } from '@/lib/roleRoutes'
import { cn } from '@/components/ui/HmsUI'

export interface MenuItem {
  name: string
  path: string
  icon: LucideIcon
  permission?: Permission
  group?: 'Overview' | 'Care workspace' | 'Operations' | 'Administration' | 'Governance'
}

const MENU_ITEMS: Record<UserRole, readonly MenuItem[]> = {
  patient: [
    { name: 'My overview', path: '/patient/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Appointments', path: '/patient/appointments', icon: CalendarDays, permission: PERMISSIONS.APPOINTMENTS_VIEW_SELF, group: 'Care workspace' },
    { name: 'Prescriptions', path: '/patient/prescriptions', icon: Pill, permission: PERMISSIONS.PRESCRIPTIONS_VIEW_SELF, group: 'Care workspace' },
    { name: 'Billing', path: '/patient/billing', icon: ReceiptIndianRupee, permission: PERMISSIONS.BILLING_VIEW_SELF, group: 'Operations' },
    { name: 'My profile', path: '/patient/profile', icon: UserCog, permission: PERMISSIONS.PATIENTS_VIEW_SELF, group: 'Administration' },
  ],
  receptionist: [
    { name: 'Front desk', path: '/receptionist/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Patients', path: '/receptionist/patients', icon: Users, permission: PERMISSIONS.PATIENTS_VIEW, group: 'Care workspace' },
    { name: 'Register patient', path: '/receptionist/register-patient', icon: UserPlus, permission: PERMISSIONS.PATIENTS_CREATE, group: 'Care workspace' },
    { name: 'Schedule', path: '/receptionist/schedule', icon: CalendarDays, permission: PERMISSIONS.APPOINTMENTS_CREATE, group: 'Operations' },
    { name: "Today's queue", path: '/receptionist/queue', icon: ClipboardList, permission: PERMISSIONS.APPOINTMENTS_VIEW, group: 'Operations' },
    { name: 'Billing desk', path: '/receptionist/billing', icon: CreditCard, permission: PERMISSIONS.BILLING_COLLECT, group: 'Operations' },
  ],
  doctor: [
    { name: 'Clinical overview', path: '/doctor/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Appointments', path: '/doctor/appointments', icon: CalendarDays, permission: PERMISSIONS.APPOINTMENTS_VIEW, group: 'Care workspace' },
    { name: 'Patients', path: '/doctor/patients', icon: Users, permission: PERMISSIONS.PATIENTS_VIEW, group: 'Care workspace' },
    { name: 'Consultation', path: '/doctor/consultation', icon: Stethoscope, permission: PERMISSIONS.CONSULTATIONS_CREATE, group: 'Care workspace' },
    { name: 'My profile', path: '/doctor/profile', icon: UserCog, permission: PERMISSIONS.DOCTORS_UPDATE_SELF, group: 'Administration' },
  ],
  admin: [
    { name: 'Hospital overview', path: '/admin/home', icon: LayoutDashboard, permission: PERMISSIONS.REPORTS_VIEW, group: 'Overview' },
    { name: 'Doctors', path: '/admin/doctors', icon: Stethoscope, permission: PERMISSIONS.DOCTORS_VIEW, group: 'Care workspace' },
    { name: 'Employees', path: '/admin/employees', icon: Users, permission: PERMISSIONS.STAFF_VIEW, group: 'Administration' },
    { name: 'Staff accounts', path: '/admin/staff', icon: UserPlus, permission: PERMISSIONS.STAFF_CREATE, group: 'Administration' },
    { name: 'Patients', path: '/admin/patients', icon: FileHeart, permission: PERMISSIONS.PATIENTS_VIEW, group: 'Care workspace' },
    { name: 'Appointments', path: '/admin/appointments', icon: CalendarDays, permission: PERMISSIONS.APPOINTMENTS_VIEW, group: 'Operations' },
    { name: 'Billing', path: '/admin/billing', icon: WalletCards, permission: PERMISSIONS.BILLING_REPORT, group: 'Operations' },
  ],
  super_admin: [
    { name: 'Control center', path: '/super-admin/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'All users', path: '/super-admin/users', icon: Users, group: 'Administration' },
    { name: 'Administrators', path: '/super-admin/admins', icon: ShieldPlus, permission: PERMISSIONS.STAFF_MANAGE_ROLES, group: 'Administration' },
    { name: 'Hospitals', path: '/super-admin/hospitals', icon: Building2, permission: PERMISSIONS.ORGANIZATIONS_MANAGE, group: 'Administration' },
    { name: 'Roles', path: '/super-admin/roles', icon: UserCog, permission: PERMISSIONS.STAFF_MANAGE_ROLES, group: 'Governance' },
    { name: 'Role grants', path: '/super-admin/permissions', icon: ShieldCheck, permission: PERMISSIONS.STAFF_MANAGE_ROLES, group: 'Governance' },
    { name: 'System settings', path: '/super-admin/settings', icon: Settings, permission: PERMISSIONS.SETTINGS_MANAGE, group: 'Governance' },
    { name: 'Feature flags', path: '/super-admin/features', icon: ClipboardCheck, permission: PERMISSIONS.FEATURES_MANAGE, group: 'Governance' },
    { name: 'Audit logs', path: '/super-admin/audit-logs', icon: FileText, group: 'Governance' },
    { name: 'System health', path: '/super-admin/system-health', icon: Activity, group: 'Governance' },
  ],
  hospital_manager: [
    { name: 'Operations center', path: '/manager/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Appointments', path: '/manager/appointments', icon: CalendarDays, permission: PERMISSIONS.APPOINTMENTS_VIEW, group: 'Operations' },
    { name: 'Patients', path: '/manager/patients', icon: FileHeart, permission: PERMISSIONS.PATIENTS_VIEW, group: 'Operations' },
    { name: 'Doctors', path: '/manager/doctors', icon: Stethoscope, permission: PERMISSIONS.DOCTORS_VIEW, group: 'Operations' },
    { name: 'Staff', path: '/manager/staff', icon: Users, permission: PERMISSIONS.STAFF_VIEW, group: 'Operations' },
    { name: 'Reports', path: '/manager/reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW, group: 'Operations' },
    { name: 'Departments', path: '/manager/departments', icon: Building2, permission: PERMISSIONS.DEPARTMENTS_VIEW, group: 'Administration' },
  ],
  nurse: [
    { name: 'Nursing overview', path: '/nurse/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Assigned patients', path: '/nurse/patients', icon: Bed, permission: PERMISSIONS.NURSING_VIEW, group: 'Care workspace' },
    { name: 'Appointments', path: '/nurse/appointments', icon: CalendarDays, permission: PERMISSIONS.NURSING_VIEW, group: 'Care workspace' },
    { name: 'Record vitals', path: '/nurse/vitals', icon: HeartPulse, permission: PERMISSIONS.NURSING_RECORD_VITALS, group: 'Care workspace' },
    { name: 'Nursing tasks', path: '/nurse/tasks', icon: ClipboardCheck, permission: PERMISSIONS.NURSING_MANAGE_TASKS, group: 'Operations' },
  ],
  pharmacist: [
    { name: 'Pharmacy overview', path: '/pharmacist/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Prescriptions', path: '/pharmacist/prescriptions', icon: FileCheck2, permission: PERMISSIONS.PHARMACY_VIEW, group: 'Care workspace' },
    { name: 'Dispensing', path: '/pharmacist/dispensing', icon: Pill, permission: PERMISSIONS.PHARMACY_DISPENSE, group: 'Operations' },
    { name: 'Inventory', path: '/pharmacist/inventory', icon: PackageSearch, permission: PERMISSIONS.PHARMACY_INVENTORY, group: 'Operations' },
  ],
  lab_technician: [
    { name: 'Lab overview', path: '/lab/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Lab orders', path: '/lab/orders', icon: FlaskConical, permission: PERMISSIONS.LABORATORY_VIEW, group: 'Care workspace' },
    { name: 'Results', path: '/lab/results', icon: TestTube2, permission: PERMISSIONS.LABORATORY_RESULT, group: 'Operations' },
  ],
  radiologist: [
    { name: 'Imaging overview', path: '/radiologist/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Imaging orders', path: '/radiologist/orders', icon: Microscope, permission: PERMISSIONS.RADIOLOGY_VIEW, group: 'Care workspace' },
    { name: 'Reports', path: '/radiologist/reports', icon: FileText, permission: PERMISSIONS.RADIOLOGY_REPORT, group: 'Operations' },
  ],
  accountant: [
    { name: 'Finance overview', path: '/accountant/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Invoices', path: '/accountant/invoices', icon: ReceiptIndianRupee, permission: PERMISSIONS.BILLING_VIEW, group: 'Operations' },
    { name: 'Payments', path: '/accountant/payments', icon: CreditCard, permission: PERMISSIONS.BILLING_VIEW, group: 'Operations' },
    { name: 'Expenses', path: '/accountant/expenses', icon: WalletCards, permission: PERMISSIONS.ACCOUNTING_RECORD_EXPENSE, group: 'Operations' },
    { name: 'Reports', path: '/accountant/reports', icon: BarChart3, permission: PERMISSIONS.REPORTS_VIEW, group: 'Operations' },
  ],
  insurance_officer: [
    { name: 'Claims overview', path: '/insurance/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Patients', path: '/insurance/patients', icon: FileHeart, permission: PERMISSIONS.INSURANCE_VIEW, group: 'Care workspace' },
    { name: 'Claims', path: '/insurance/claims', icon: ClipboardList, permission: PERMISSIONS.INSURANCE_CLAIM, group: 'Operations' },
    { name: 'Approvals', path: '/insurance/approvals', icon: FileCheck2, permission: PERMISSIONS.INSURANCE_APPROVE, group: 'Operations' },
  ],
  ambulance_staff: [
    { name: 'Transport overview', path: '/ambulance/home', icon: LayoutDashboard, group: 'Overview' },
    { name: 'Requests', path: '/ambulance/requests', icon: ClipboardList, permission: PERMISSIONS.AMBULANCE_VIEW, group: 'Operations' },
    { name: 'Trips', path: '/ambulance/trips', icon: Ambulance, permission: PERMISSIONS.AMBULANCE_UPDATE_STATUS, group: 'Operations' },
    { name: 'Ambulances', path: '/ambulance/vehicles', icon: Hospital, permission: PERMISSIONS.AMBULANCE_VIEW, group: 'Operations' },
  ],
}

export const ROLE_LABELS: Record<UserRole, string> = {
  patient: 'Patient', doctor: 'Doctor', receptionist: 'Receptionist', admin: 'Administrator',
  super_admin: 'Super Administrator', hospital_manager: 'Hospital Manager', nurse: 'Nurse',
  pharmacist: 'Pharmacist', lab_technician: 'Lab Technician', radiologist: 'Radiologist',
  accountant: 'Accountant', insurance_officer: 'Insurance Officer', ambulance_staff: 'Ambulance Staff',
}

export function visibleMenuItems(portalRole: UserRole, permissions: readonly Permission[]) {
  return MENU_ITEMS[portalRole].filter((item) => !item.permission || hasPermission(permissions, item.permission))
}

interface SidebarProps {
  role: UserRole
  portalRole?: UserRole
  permissions?: readonly Permission[]
  collapsed?: boolean
  mobileOpen?: boolean
  onCollapse?: () => void
  onClose?: () => void
}

export default function Sidebar({ role, portalRole = role, permissions = [], collapsed = false, mobileOpen = false, onCollapse, onClose }: SidebarProps) {
  const pathname = usePathname()
  const portalItems = visibleMenuItems(portalRole, permissions)
  const items = portalRole === role
    ? portalItems
    : [{ name: 'Back to my portal', path: ROLE_HOME[role], icon: ChevronLeft, group: 'Overview' as const }, ...portalItems]
  const groups = Array.from(new Set(items.map((item) => item.group || 'Operations')))

  return (
    <aside className={cn(
      'hms-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh flex-col overflow-hidden bg-[var(--hms-sidebar)] text-white shadow-2xl transition-all duration-200 ease-premium lg:relative lg:z-20 lg:translate-x-0 lg:shadow-none',
      collapsed ? 'w-[5.25rem]' : 'w-[17.5rem]', mobileOpen ? 'translate-x-0' : '-translate-x-full',
    )} aria-label={`${ROLE_LABELS[portalRole]} navigation`}>
      <div className={cn('flex h-[4.5rem] shrink-0 items-center border-b border-white/10', collapsed ? 'justify-center px-3' : 'gap-3 px-5')}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#0b7767] shadow-sm"><HeartPulse aria-hidden="true" className="h-5 w-5" /></div>
        {!collapsed && <div className="min-w-0"><p className="truncate text-[0.98rem] font-bold tracking-tight">HMS Platform</p><p className="truncate text-[0.68rem] font-medium uppercase tracking-[0.15em] text-emerald-100/60">Care operations</p></div>}
        <button type="button" onClick={onClose} className="ml-auto rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close navigation"><X className="h-5 w-5" /></button>
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {groups.map((group) => <section key={group} className="mb-5">
          {!collapsed && <h2 className="mb-2 px-3 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-emerald-100/45">{group}</h2>}
          <ul className="space-y-1">{items.filter((item) => (item.group || 'Operations') === group).map((item) => {
            const active = pathname === item.path || pathname.startsWith(`${item.path}/`)
            const Icon = item.icon
            return <li key={item.path}><Link href={item.path} onClick={onClose} title={collapsed ? item.name : undefined} aria-current={active ? 'page' : undefined} className={cn('group relative flex min-h-11 items-center rounded-xl text-sm font-medium', collapsed ? 'justify-center px-2' : 'gap-3 px-3', active ? 'bg-white text-[#0b5f55] shadow-sm' : 'text-emerald-50/72 hover:bg-white/10 hover:text-white')}>
              {active && !collapsed && <span className="absolute -left-3 h-6 w-1 rounded-r-full bg-emerald-300" />}
              <Icon aria-hidden="true" className={cn('h-[1.1rem] w-[1.1rem] shrink-0', active ? 'text-[#0b7767]' : 'text-emerald-100/65 group-hover:text-emerald-100')} />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link></li>
          })}</ul>
        </section>)}
      </nav>
      <div className="shrink-0 border-t border-white/10 p-3">
        <button type="button" onClick={onCollapse} className="mb-2 hidden w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-50/60 hover:bg-white/10 hover:text-white lg:flex" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}>{collapsed ? <ChevronRight className="h-4 w-4" /> : <><ChevronLeft className="h-4 w-4" /><span>Collapse menu</span></>}</button>
        <button type="button" onClick={() => logoutAction()} className={cn('flex min-h-11 w-full items-center rounded-xl text-sm font-semibold text-rose-200 hover:bg-rose-500/10 hover:text-rose-100', collapsed ? 'justify-center px-2' : 'gap-3 px-3')} title={collapsed ? 'Sign out' : undefined}><LogOut aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" />{!collapsed && <span>Sign out</span>}</button>
      </div>
    </aside>
  )
}
