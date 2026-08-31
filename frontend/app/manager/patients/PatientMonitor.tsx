'use client'

import { Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ManagerPatient } from '@/lib/managerTypes'

export default function PatientMonitor({ patients }: { patients: ManagerPatient[] }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const filtered = useMemo(() => patients.filter((patient) => !normalized
    || patient.name.toLowerCase().includes(normalized)
    || String(patient.id).includes(normalized.replace(/^#/, '')),
  ), [normalized, patients])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Operational directory</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Patients</h1>
        <p className="mt-1 text-slate-600">Basic patient and appointment-flow information without clinical history.</p>
      </div>
      <label className="relative block max-w-2xl">
        <span className="sr-only">Search patients</span>
        <Search className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by patient name or ID" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-12 pr-4 shadow-sm" />
      </label>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Users className="mx-auto h-9 w-9 text-slate-400" />
          <p className="mt-3 font-medium text-slate-800">{patients.length ? 'No matching patients' : 'No patients available'}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-6 py-4">Patient</th><th className="px-6 py-4">Demographics</th><th className="px-6 py-4">Contact</th><th className="px-6 py-4">Appointments</th><th className="px-6 py-4">Last visit</th><th className="px-6 py-4">Next visit</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4"><p className="font-semibold text-slate-900">{patient.name}</p><p className="text-slate-500">Patient #{patient.id}</p></td>
                    <td className="px-6 py-4 capitalize text-slate-700">{patient.age === null ? 'Age not recorded' : `${patient.age} years`} · {patient.gender || 'Not recorded'}</td>
                    <td className="px-6 py-4 text-slate-700">{patient.contact || 'Not provided'}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{patient.appointment_count}</td>
                    <td className="px-6 py-4 text-slate-700">{patient.last_appointment_date || 'None'}</td>
                    <td className="px-6 py-4 text-slate-700">{patient.next_appointment_date || 'None scheduled'}</td>
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
