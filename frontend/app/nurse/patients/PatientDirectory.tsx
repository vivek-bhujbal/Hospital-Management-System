'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { NursePatient } from '@/lib/nurseTypes'
import { statusClass, statusLabel } from '@/lib/nurseTypes'

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
          <p className="p-10 text-center text-slate-500">No assigned patients match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-6 py-4">Patient</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Tasks</th><th className="px-6 py-4">Latest appointment</th><th className="px-6 py-4">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((patient) => (
                  <tr key={patient.id}>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{patient.name}</p>
                      <p className="mt-1 text-xs capitalize text-slate-500">#{patient.id} · {patient.age ?? 'Age not recorded'} · {patient.gender || 'Gender not recorded'} · {patient.blood_group || 'Blood group N/A'}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{patient.contact || 'Not provided'}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{patient.active_task_count} active</p>
                      {patient.urgent_task_count > 0 && <p className="mt-1 text-xs font-semibold text-red-700">{patient.urgent_task_count} urgent</p>}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700">{patient.latest_appointment_date || 'No appointment'}</p>
                      {patient.latest_appointment_status && (
                        <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(patient.latest_appointment_status)}`}>
                          {statusLabel(patient.latest_appointment_status)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/nurse/patient/${patient.id}`} className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-700">View care record</Link>
                    </td>
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
