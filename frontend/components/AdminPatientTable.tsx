'use client'

import { useMemo, useState } from 'react'

export interface AdminPatient {
  id: number
  name: string
  age: number | null
  gender: string | null
  contact: string | null
  blood_group: string | null
}

export default function AdminPatientTable({ patients }: { patients: AdminPatient[] }) {
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLowerCase()
  const filtered = useMemo(() => patients.filter((patient) => [
    patient.id,
    patient.name,
    patient.contact,
    patient.blood_group,
  ].some((value) => String(value || '').toLowerCase().includes(normalized))), [normalized, patients])

  return (
    <div className="space-y-4">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by ID, name, contact, or blood group" className="w-full max-w-xl rounded-lg border bg-white p-3" />
      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">ID</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Age/Gender</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Contact</th><th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Blood group</th></tr></thead>
          <tbody className="divide-y bg-white">
            {filtered.length === 0 ? <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No matching patients.</td></tr> : filtered.map((patient) => (
              <tr key={patient.id}><td className="px-6 py-4">#{patient.id}</td><td className="px-6 py-4 font-medium">{patient.name}</td><td className="px-6 py-4">{patient.age ?? '—'} / {patient.gender || '—'}</td><td className="px-6 py-4">{patient.contact || '—'}</td><td className="px-6 py-4 font-semibold text-red-600">{patient.blood_group || '—'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
