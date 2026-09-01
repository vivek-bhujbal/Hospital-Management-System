import { ArrowRight, BriefcaseMedical, Building2, Crown, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/ui/HmsUI'

const ROLE_GROUPS = [
  {
    title: 'Platform ownership',
    roles: [
      ['Super Admin', 'Owns platform configuration, organizations, Admin accounts, feature flags, role grants, audit logs, and system health.'],
    ],
  },
  {
    title: 'Hospital administration',
    roles: [
      ['Admin', 'Runs hospital operations: doctors, receptionist employees, patients, appointments, and billing.'],
      ['Hospital Manager', 'Read-only hospital operations role provisioned by Admin; monitors appointments, patients, doctors, staff, departments, and reports.'],
    ],
  },
  {
    title: 'Clinical and operational roles',
    roles: [
      ['Doctor', 'Consultations, assigned patients, prescriptions, laboratory orders, and radiology orders.'],
      ['Receptionist', 'Permission-scoped patient registration, scheduling, check-in, and payment collection.'],
      ['Nurse', 'Assignment-scoped patient care, vitals, notes, and nursing tasks.'],
      ['Pharmacist', 'Medicine inventory, purchasing, dispensing, and pharmacy alerts.'],
      ['Lab Technician', 'Laboratory samples, results, verification, and reports.'],
      ['Radiologist', 'Radiology studies, reports, amendments, and verification.'],
      ['Accountant', 'Transactions, expenses, refunds, billing reports, and daily closing.'],
      ['Insurance Officer', 'Providers, policies, claims, documents, and insurer payments.'],
      ['Ambulance Staff', 'Assigned vehicle, dispatch requests, trips, and trip status.'],
      ['Patient', 'Self-service appointments, clinical records, billing, and profile management.'],
    ],
  },
] as const

export default function SuperAdminRoles() {
  const groupIcons = [Crown, Building2, BriefcaseMedical]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Access governance" title="Role hierarchy" description="Understand account ownership and operational responsibilities across the platform. This reference does not change user roles." />
      <div className="hms-card flex flex-col items-stretch gap-3 bg-gradient-to-r from-brand-50/80 to-white p-5 dark:from-brand-950/50 dark:to-slate-950 md:flex-row md:items-center">{['Super Admin', 'Admin', 'Hospital Manager & staff'].map((role, index) => <div key={role} className="contents"><div className="flex flex-1 items-center gap-3 rounded-xl border border-brand-100 bg-white/80 p-4 dark:border-brand-900 dark:bg-slate-950/70"><ShieldCheck className="h-5 w-5 text-brand-700 dark:text-brand-300" /><span className="font-bold text-slate-900 dark:text-slate-50">{role}</span></div>{index < 2 && <ArrowRight className="mx-auto h-5 w-5 rotate-90 text-brand-600 md:rotate-0" />}</div>)}</div>
      {ROLE_GROUPS.map((group, index) => { const Icon = groupIcons[index]; return (
        <section key={group.title} className="hms-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><Icon className="h-5 w-5" /></span><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{group.title}</h2></div>
          <div className="grid gap-4 p-5 md:grid-cols-2 sm:p-6">
            {group.roles.map(([role, description]) => (
              <div key={role} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-brand-900">
                <h3 className="font-bold text-slate-900 dark:text-slate-50">{role}</h3>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </section>
      )})}
    </div>
  )
}
