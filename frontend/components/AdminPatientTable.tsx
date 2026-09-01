'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/HmsUI'

export interface AdminPatient { id: number; name: string; age: number | null; gender: string | null; contact: string | null; blood_group: string | null }

export default function AdminPatientTable({ patients }: { patients: AdminPatient[] }) {
  const [query, setQuery] = useState(''); const normalized = query.trim().toLowerCase()
  const filtered = useMemo(() => patients.filter(patient => [patient.id, patient.name, patient.contact, patient.blood_group].some(value => String(value || '').toLowerCase().includes(normalized))), [normalized, patients])
  return <div className="space-y-4">
    <div className="hms-card p-4"><label className="relative block max-w-2xl"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} aria-label="Search patients" placeholder="Search by ID, name, contact, or blood group" className="hms-input pl-10" /></label></div>
    <div className="hms-card overflow-hidden">{filtered.length === 0 ? <EmptyState title="No matching patients" description="Adjust your search to find another patient record." /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-5 py-3 text-left">Patient</th><th className="px-5 py-3 text-left">Age / gender</th><th className="px-5 py-3 text-left">Contact</th><th className="px-5 py-3 text-left">Blood group</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{filtered.map(patient => <tr key={patient.id}><td className="px-5 py-4"><p className="font-semibold">{patient.name}</p><p className="text-xs text-slate-500">ID #{patient.id}</p></td><td className="px-5 py-4">{patient.age ?? '—'} / {patient.gender || '—'}</td><td className="px-5 py-4">{patient.contact || '—'}</td><td className="px-5 py-4"><span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">{patient.blood_group || '—'}</span></td></tr>)}</tbody></table></div>}</div>
  </div>
}
