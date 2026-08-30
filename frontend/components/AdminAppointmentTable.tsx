'use client'

import { useMemo, useState } from 'react'

export interface AdminAppointment {
  id: number
  patient_id: number
  doctor_id: number
  appt_date: string
  appt_time: string
  status: string
}

export default function AdminAppointmentTable({ appointments }: { appointments: AdminAppointment[] }) {
  const [status, setStatus] = useState('all')
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => appointments.filter((appointment) => {
    const statusMatches = status === 'all' || appointment.status === status
    const text = `${appointment.id} ${appointment.patient_id} ${appointment.doctor_id} ${appointment.appt_date}`
    return statusMatches && text.includes(query.trim())
  }), [appointments, query, status])
  const statuses = Array.from(new Set(appointments.map((appointment) => appointment.status))).sort()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by ID, patient, doctor, or date" className="min-w-72 rounded-lg border bg-white p-3" />
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border bg-white p-3"><option value="all">All statuses</option>{statuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Appointment</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Date/time</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Patient</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Doctor</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th></tr></thead>
          <tbody className="divide-y bg-white">{filtered.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No matching appointments.</td></tr> : filtered.map((appointment) => <tr key={appointment.id}><td className="px-6 py-4">#{appointment.id}</td><td className="px-6 py-4">{appointment.appt_date} {appointment.appt_time}</td><td className="px-6 py-4">#{appointment.patient_id}</td><td className="px-6 py-4">#{appointment.doctor_id}</td><td className="px-6 py-4 capitalize">{appointment.status.replaceAll('_', ' ')}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  )
}
