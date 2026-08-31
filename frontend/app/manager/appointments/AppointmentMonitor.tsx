'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import {
  appointmentStatusClass,
  ManagerAppointment,
  ManagerDepartment,
  ManagerDoctor,
  shortTime,
  statusLabel,
} from '@/lib/managerTypes'

interface AppointmentMonitorProps {
  appointments: ManagerAppointment[]
  doctors: ManagerDoctor[]
  departments: ManagerDepartment[]
}

export default function AppointmentMonitor({ appointments, doctors, departments }: AppointmentMonitorProps) {
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [status, setStatus] = useState('')
  const normalized = query.trim().toLowerCase()
  const filtered = useMemo(() => appointments.filter((appointment) => {
    const matchesQuery = !normalized
      || appointment.patient_name.toLowerCase().includes(normalized)
      || appointment.doctor_name.toLowerCase().includes(normalized)
      || String(appointment.id).includes(normalized.replace(/^#/, ''))
    return matchesQuery
      && (!date || appointment.appt_date === date)
      && (!doctorId || appointment.doctor_id === Number(doctorId))
      && (!departmentId || appointment.department_id === Number(departmentId))
      && (!status || appointment.status === status)
  }), [appointments, date, departmentId, doctorId, normalized, status])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Patient flow monitoring</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Appointments</h1>
        <p className="mt-1 text-slate-600">Hospital-wide read-only appointment and check-in status.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <label className="relative block">
          <span className="sr-only">Search appointments</span>
          <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Patient, doctor, or ID" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3" />
        </label>
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} aria-label="Filter by date" className="rounded-lg border border-slate-300 px-3 py-2.5" />
        <select value={doctorId} onChange={(event) => setDoctorId(event.target.value)} aria-label="Filter by doctor" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5">
          <option value="">All doctors</option>
          {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
        </select>
        <select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)} aria-label="Filter by department" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5">
          <option value="">All departments</option>
          {departments.map((department) => <option key={department.department_id} value={department.department_id}>{department.name}</option>)}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by status" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5">
          <option value="">All statuses</option>
          {['requested', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled'].map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          {appointments.length ? 'No appointments match the selected filters.' : 'No appointments available.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-5 py-4">Appointment</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Doctor / department</th><th className="px-5 py-4">Schedule</th><th className="px-5 py-4">Reason</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Check-in</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((appointment) => (
                  <tr key={appointment.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">#{appointment.id}</td>
                    <td className="px-5 py-4"><p className="font-medium text-slate-900">{appointment.patient_name}</p><p className="text-slate-500">Patient #{appointment.patient_id}</p></td>
                    <td className="px-5 py-4"><p className="font-medium text-slate-900">{appointment.doctor_name}</p><p className="text-slate-500">{appointment.department_name || 'No department'}</p></td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700"><p>{appointment.appt_date}</p><p className="text-slate-500">{shortTime(appointment.appt_time)}</p></td>
                    <td className="max-w-xs px-5 py-4 text-slate-700">{appointment.reason || 'Not recorded'}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${appointmentStatusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span></td>
                    <td className="px-5 py-4 text-slate-700">{appointment.checked_in_at ? 'Checked in' : 'Not checked in'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
