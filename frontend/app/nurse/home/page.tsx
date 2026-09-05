import Link from 'next/link'

import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import type { NurseDashboardData } from '@/lib/nurseTypes'
import { priorityClass, shortTime, statusClass, statusLabel } from '@/lib/nurseTypes'

export default async function NurseDashboard() {
  const dashboard = await fetchAPI('/nurse/dashboard') as NurseDashboardData
  const metrics = [
    ['Active tasks', dashboard.active_tasks],
    ['Pending nursing tasks', dashboard.patients_requiring_tasks],
    ['Require vitals', dashboard.patients_requiring_vitals],
    ['Today assigned patients', dashboard.today_assigned_patients],
    ['Waiting patients', dashboard.waiting_patients],
  ] as const
  return (
    <div className="space-y-6">
      <AutoRefresh interval={30000} />
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Clinical support</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Nurse Dashboard</h1><p className="mt-1 text-slate-600">Your assigned patients, appointments, observations, and care tasks.</p></div>
        <div className="flex gap-2"><Link href="/nurse/vitals" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Record vitals</Link><Link href="/nurse/tasks" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">View tasks</Link></div>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-slate-900">Urgent alerts</h2><Link href="/nurse/tasks" className="text-sm font-semibold text-blue-700">All tasks</Link></div>
        {dashboard.urgent_alerts.length === 0 ? <p className="mt-5 rounded-xl bg-emerald-50 p-5 text-sm font-medium text-emerald-800">No high-priority or urgent tasks assigned.</p> : <div className="mt-4 grid gap-3 lg:grid-cols-2">{dashboard.urgent_alerts.map((alert) => <Link key={alert.task_id} href={`/nurse/patient/${alert.patient_id}`} className="block rounded-xl border border-slate-200 p-4 hover:border-blue-300"><div className="flex justify-between gap-3"><p className="font-semibold text-slate-900">{alert.patient_name}</p><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${priorityClass(alert.priority)}`}>{alert.priority === 'emergency' ? 'Urgent' : alert.priority}</span></div><p className="mt-2 text-sm text-slate-700">{alert.description}</p><p className="mt-2 text-xs text-slate-500">Due {alert.due_at ? new Date(alert.due_at).toLocaleString() : 'not specified'}</p></Link>)}</div>}
      </section>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{metrics.map(([label, metric]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{metric}</p></div>)}</div>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-slate-900">Upcoming appointments</h2><Link href="/nurse/appointments" className="text-sm font-semibold text-blue-700">All appointments</Link></div>
        {dashboard.upcoming_appointments.length === 0 ? <p className="mt-5 text-slate-500">No upcoming appointments for assigned patients.</p> : <div className="mt-4 divide-y divide-slate-100">{dashboard.upcoming_appointments.map((appointment) => <div key={appointment.id} className="flex items-center justify-between gap-4 py-3"><div><p className="font-semibold text-slate-900">{appointment.patient_name}</p><p className="mt-1 text-sm text-slate-500">{appointment.appt_date} at {shortTime(appointment.appt_time)} · Dr. {appointment.doctor_name}</p></div><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span></div>)}</div>}
      </section>
      <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Assignment-scoped only. Billing, payments, insurance, and hospital-wide finance are not available.</p>
    </div>
  )
}
