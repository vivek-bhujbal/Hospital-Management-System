'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { NurseAppointment } from '@/lib/nurseTypes'
import { priorityClass, shortTime, statusClass, statusLabel } from '@/lib/nurseTypes'

export default function AppointmentMonitor({ appointments }: { appointments: NurseAppointment[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const filtered = useMemo(() => appointments.filter((appointment) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || [appointment.patient_name, appointment.doctor_name, appointment.reason, String(appointment.id)]
      .some((value) => value?.toLowerCase().includes(query))
    return matchesSearch && (status === 'all' || appointment.status === status)
  }), [appointments, search, status])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Assigned care</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Appointments</h1>
        <p className="mt-1 text-slate-600">Read-only appointments for patients currently assigned to you.</p>
      </div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient, doctor, reason, ID" className="rounded-xl border border-slate-300 px-4 py-3" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3">
          <option value="all">All statuses</option>
          {['requested', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled'].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
        </select>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? <p className="p-10 text-center text-slate-500">No assigned appointments found.</p> : (
          <div className="divide-y divide-slate-100">
            {filtered.map((appointment) => (
              <div key={appointment.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_1fr_1fr_auto] lg:items-center">
                <div>
                  <p className="font-semibold text-slate-900">{appointment.patient_name}</p>
                  <p className="mt-1 text-sm text-slate-500">Appointment #{appointment.id} · {appointment.reason || 'No reason recorded'}</p>
                </div>
                <div className="text-sm text-slate-700"><p>{appointment.appt_date} at {shortTime(appointment.appt_time)}</p><p className="mt-1">Dr. {appointment.doctor_name}</p></div>
                <div>
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {appointment.nursing_tasks.map((task) => <span key={task.id} className={`rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${priorityClass(task.priority)}`}>{task.task_type}: {statusLabel(task.status)}</span>)}
                  </div>
                </div>
                <Link href={`/nurse/patient/${appointment.patient_id}`} className="rounded-lg border border-blue-200 px-3 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50">View patient</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
