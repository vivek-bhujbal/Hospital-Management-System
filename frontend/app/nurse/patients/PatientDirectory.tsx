'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { NursePatient } from '@/lib/nurseTypes'
import { priorityClass, statusClass, statusLabel } from '@/lib/nurseTypes'

export default function PatientDirectory({ patients }: { patients: NursePatient[] }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return patients
    return patients.filter((patient) => [
      patient.name,
      patient.contact,
      patient.blood_group,
      String(patient.id),
    ].some((value) => value?.toLowerCase().includes(query)))
  }, [patients, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Assigned care</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Patients</h1>
          <p className="mt-1 text-slate-600">Only patients with an active task assigned to you are shown.</p>
        </div>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, ID, contact, blood group"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 lg:max-w-sm"
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-slate-500">{patients.length === 0 ? 'No nursing tasks assigned yet.' : 'No assigned patients match your search.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-6 py-4">Patient</th><th className="px-6 py-4">Doctor</th><th className="px-6 py-4">Active care</th><th className="px-6 py-4">Latest vital</th><th className="px-6 py-4">Latest appointment</th><th className="px-6 py-4">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{patient.name}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500">#{patient.id} · {patient.age ?? 'Age not recorded'} · {patient.gender || 'Gender not recorded'} · {patient.blood_group || 'Blood group N/A'}</p>
                    </td>
                    <td className="px-6 py-4"><p className="font-medium text-slate-800">{patient.assigned_doctor_name ? `Dr. ${patient.assigned_doctor_name}` : 'Not recorded'}</p><p className="mt-1 text-xs text-slate-500">{patient.contact || 'No contact'}</p></td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${priorityClass(patient.highest_task_priority)}`}>{patient.highest_task_priority === 'emergency' ? 'urgent' : patient.highest_task_priority}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(patient.current_task_status)}`}>{statusLabel(patient.current_task_status)}</span></div>
                      <p className="mt-2 text-xs text-slate-500">{patient.active_task_count} active task{patient.active_task_count === 1 ? '' : 's'}</p>
                      {patient.urgent_task_count > 0 && <p className="mt-1 text-xs font-semibold text-red-700">{patient.urgent_task_count} urgent</p>}
                    </td>
                    <td className="px-6 py-4"><p className="text-slate-700">Pulse {patient.latest_pulse ?? '—'} · SpO₂ {patient.latest_oxygen_saturation ?? '—'}</p><p className="mt-1 text-xs text-slate-500">{patient.latest_vital_at ? new Date(patient.latest_vital_at).toLocaleString() : 'No readings recorded'}</p></td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{patient.latest_appointment_date || 'No appointment'}</p>
                      {patient.latest_appointment_status && (
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(patient.latest_appointment_status)}`}>
                          {statusLabel(patient.latest_appointment_status)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4"><div className="flex min-w-36 flex-col gap-2"><Link href={`/nurse/patient/${patient.id}`} className="rounded-lg bg-blue-600 px-3 py-2 text-center font-semibold text-white hover:bg-blue-700">View patient</Link><Link href={`/nurse/history/${patient.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 hover:bg-slate-50">Work history</Link><Link href={`/nurse/tasks?patient_id=${patient.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 hover:bg-slate-50">View tasks</Link><Link href={`/nurse/vitals?patient_id=${patient.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 hover:bg-slate-50">Record vitals</Link><Link href={`/nurse/patient/${patient.id}#nursing-note`} className="text-center text-xs font-semibold text-blue-700">Add nursing note</Link></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
