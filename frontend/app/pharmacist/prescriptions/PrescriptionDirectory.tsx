'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import type { PharmacyPrescription } from '@/lib/pharmacistTypes'
import { pharmacyStatusClass, pharmacyStatusLabel } from '@/lib/pharmacistTypes'

export default function PrescriptionDirectory({ prescriptions }: { prescriptions: PharmacyPrescription[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const filtered = useMemo(() => prescriptions.filter(item => {
    const matches = `${item.id} ${item.patient_name} ${item.doctor_name} ${item.medicine || ''}`.toLowerCase().includes(search.toLowerCase())
    return matches && (status === 'all' || item.pharmacy_status === status)
  }), [prescriptions, search, status])
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Read-only clinical orders</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Prescriptions</h1><p className="mt-1 text-slate-600">Search, verify, reject, or prepare valid doctor prescriptions for dispensing.</p></div>
    <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-3"><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, doctor, medicine, or ID" className="md:col-span-2 rounded-xl border border-slate-300 px-4 py-3"/><select value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="all">All statuses</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="ready_for_dispensing">Ready for dispensing</option><option value="dispensed">Dispensed</option><option value="rejected">Rejected</option></select></div>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{filtered.length === 0 ? <p className="p-10 text-center text-slate-500">No matching prescriptions.</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Doctor</th><th className="px-5 py-4">Medicine / dosage</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y">{filtered.map(item => <tr key={item.id}><td className="px-5 py-4"><p className="font-semibold">{item.patient_name}</p><p className="text-xs text-slate-500">Prescription #{item.id}</p></td><td className="px-5 py-4">{item.doctor_name}</td><td className="px-5 py-4"><p>{item.medicine || 'Not specified'}</p><p className="text-xs text-slate-500">{item.dosage || 'No dosage'}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${pharmacyStatusClass(item.pharmacy_status)}`}>{pharmacyStatusLabel(item.pharmacy_status)}</span></td><td className="px-5 py-4"><Link href={`/pharmacist/prescriptions/${item.id}`} className="font-semibold text-blue-700">Review</Link></td></tr>)}</tbody></table></div>}</section>
  </div>
}
