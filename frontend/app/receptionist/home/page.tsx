import Link from 'next/link'
import {
  CalendarDays,
  ClipboardPlus,
  CreditCard,
  Hourglass,
  UserCheck,
  Users,
  UsersRound,
} from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { dateValue, ReceptionAppointment, ReceptionBill, ReceptionPatient } from '@/lib/receptionistTypes'
import { getCurrentPermissions } from '@/lib/serverPermissions'

export default async function ReceptionistHome() {
  const today = dateValue()
  const [patients, appointments, bills, permissions] = await Promise.all([
    fetchAPI('/patients/') as Promise<ReceptionPatient[]>,
    fetchAPI(`/appointments/?date=${today}`) as Promise<ReceptionAppointment[]>,
    fetchAPI('/billing/').catch(() => []) as Promise<ReceptionBill[]>,
    getCurrentPermissions(),
  ])

  const metrics = [
    { label: 'Registered patients', value: patients.length, icon: UsersRound, color: 'text-cyan-700 bg-cyan-50' },
    { label: "Today's appointments", value: appointments.length, icon: CalendarDays, color: 'text-blue-600 bg-blue-50' },
    { label: 'Checked-in patients', value: appointments.filter((item) => item.status === 'checked_in').length, icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Waiting patients', value: appointments.filter((item) => ['confirmed', 'checked_in'].includes(item.status)).length, icon: Hourglass, color: 'text-amber-600 bg-amber-50' },
    { label: 'Completed appointments', value: appointments.filter((item) => item.status === 'completed').length, icon: Users, color: 'text-violet-600 bg-violet-50' },
    { label: 'Pending bills', value: bills.filter((item) => item.status === 'pending').length, icon: CreditCard, color: 'text-rose-600 bg-rose-50' },
  ]

  const quickActions = [
    hasPermission(permissions, PERMISSIONS.PATIENTS_CREATE)
      ? { label: 'Register Patient', href: '/receptionist/register-patient', icon: ClipboardPlus }
      : null,
    hasPermission(permissions, PERMISSIONS.APPOINTMENTS_CREATE)
      ? { label: 'Schedule Appointment', href: '/receptionist/schedule', icon: CalendarDays }
      : null,
    hasPermission(permissions, PERMISSIONS.APPOINTMENTS_CHECKIN)
      ? { label: 'Check-in Patient', href: '/receptionist/queue', icon: UserCheck }
      : null,
    hasPermission(permissions, PERMISSIONS.BILLING_COLLECT)
      ? { label: 'Collect Payment', href: '/receptionist/billing', icon: CreditCard }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <div className="space-y-8">
      <AutoRefresh interval={15000} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Front desk</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Receptionist Dashboard</h1>
        <p className="mt-1 text-slate-600">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <section aria-label="Front-desk overview" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></div>
            <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
            <p className="mt-1 text-sm text-slate-600">{label}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
        {quickActions.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {quickActions.map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 font-medium text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" />{label}
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">No operational actions are currently assigned. Contact an administrator.</p>
        )}
      </section>
    </div>
  )
}
