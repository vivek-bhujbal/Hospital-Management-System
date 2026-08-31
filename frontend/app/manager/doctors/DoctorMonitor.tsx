'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ManagerDoctor, shortTime, statusLabel } from '@/lib/managerTypes'

export default function DoctorMonitor({ doctors }: { doctors: ManagerDoctor[] }) {
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const normalized = query.trim().toLowerCase()
  const departments = Array.from(new Set(doctors.map((doctor) => doctor.department_name).filter((value): value is string => Boolean(value)))).sort()
  const filtered = useMemo(() => doctors.filter((doctor) => (
    (!normalized || doctor.name.toLowerCase().includes(normalized) || (doctor.specialization || '').toLowerCase().includes(normalized))
    && (!department || doctor.department_name === department)
    && (!status || doctor.status === status)
  )), [department, doctors, normalized, status])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Medical workforce</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Doctors</h1>
        <p className="mt-1 text-slate-600">Read-only availability, schedule, department, and appointment workload.</p>
      </div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="relative block"><span className="sr-only">Search doctors</span><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or specialty" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3" /></label>
        <select value={department} onChange={(event) => setDepartment(event.target.value)} aria-label="Filter doctors by department" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">All departments</option>{departments.map((name) => <option key={name}>{name}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter doctors by status" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">All statuses</option><option value="active">Active</option><option value="on_leave">On leave</option></select>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{doctors.length ? 'No doctors match the selected filters.' : 'No doctors available.'}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Doctor</th><th className="px-5 py-4">Department</th><th className="px-5 py-4">Schedule</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Availability</th><th className="px-5 py-4">Today</th><th className="px-5 py-4">Pending</th><th className="px-5 py-4">Completed</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map((doctor) => (
            <tr key={doctor.id} className="hover:bg-slate-50">
              <td className="px-5 py-4"><p className="font-semibold text-slate-900">{doctor.name}</p><p className="text-slate-500">{doctor.specialization || 'Specialty not recorded'}</p></td>
              <td className="px-5 py-4 text-slate-700">{doctor.department_name || 'Not assigned'}</td>
              <td className="whitespace-nowrap px-5 py-4 text-slate-700">{shortTime(doctor.timing_start)} – {shortTime(doctor.timing_end)}</td>
              <td className="px-5 py-4 capitalize text-slate-700">{statusLabel(doctor.status)}</td>
              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${doctor.availability === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{doctor.availability}</span></td>
              <td className="px-5 py-4 font-medium text-slate-900">{doctor.appointments_today}</td><td className="px-5 py-4 text-slate-700">{doctor.appointments_pending}</td><td className="px-5 py-4 text-slate-700">{doctor.appointments_completed}</td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </div>
  )
}
