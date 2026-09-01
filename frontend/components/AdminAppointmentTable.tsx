'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { EmptyState, StatusBadge } from '@/components/ui/HmsUI'

export interface AdminAppointment { id: number; patient_id: number; doctor_id: number; appt_date: string; appt_time: string; status: string }

export default function AdminAppointmentTable({ appointments }: { appointments: AdminAppointment[] }) {
  const [status, setStatus] = useState('all'); const [query, setQuery] = useState('')
  const filtered = useMemo(() => appointments.filter(appointment => (status === 'all' || appointment.status === status) && `${appointment.id} ${appointment.patient_id} ${appointment.doctor_id} ${appointment.appt_date}`.includes(query.trim())), [appointments, query, status])
  const statuses = Array.from(new Set(appointments.map(appointment => appointment.status))).sort()
  return <div className="space-y-4">
    <div className="hms-card flex flex-wrap gap-3 p-4"><label className="relative min-w-72 flex-1"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} aria-label="Search appointments" placeholder="Filter by ID, patient, doctor, or date" className="hms-input pl-10" /></label><select aria-label="Filter by status" value={status} onChange={event => setStatus(event.target.value)} className="hms-input sm:max-w-56"><option value="all">All statuses</option>{statuses.map(item => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></div>
    <div className="hms-card overflow-hidden">{filtered.length === 0 ? <EmptyState title="No matching appointments" description="Adjust the search or status filter to see more results." /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-5 py-3 text-left">Appointment</th><th className="px-5 py-3 text-left">Date/time</th><th className="px-5 py-3 text-left">Patient</th><th className="px-5 py-3 text-left">Doctor</th><th className="px-5 py-3 text-left">Status</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{filtered.map(appointment => <tr key={appointment.id}><td className="px-5 py-4 font-semibold">#{appointment.id}</td><td className="whitespace-nowrap px-5 py-4">{appointment.appt_date} {appointment.appt_time}</td><td className="px-5 py-4">#{appointment.patient_id}</td><td className="px-5 py-4">#{appointment.doctor_id}</td><td className="px-5 py-4"><StatusBadge status={appointment.status} /></td></tr>)}</tbody></table></div>}</div>
  </div>
}
