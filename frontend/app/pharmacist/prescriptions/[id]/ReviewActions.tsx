'use client'
import Link from 'next/link'
import { useState } from 'react'
import { prescriptionAction } from '@/app/actions/pharmacist'
import SubmitButton from '@/components/SubmitButton'
import type { PharmacyPrescription } from '@/lib/pharmacistTypes'

export default function ReviewActions({ prescription }: { prescription: PharmacyPrescription }) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  async function submit(data: FormData) {
    setError(''); setSuccess('')
    const response = await prescriptionAction(data)
    if (response.error) setError(response.error)
    else setSuccess('Prescription workflow updated.')
  }
  return <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Pharmacy review</h2><p className="mt-2 text-sm text-slate-600">Actions update pharmacy metadata only; the original prescription remains unchanged.</p>{error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{success && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
    {prescription.pharmacy_status === 'pending' && <div className="mt-5 space-y-3"><form action={submit}><input type="hidden" name="prescription_id" value={prescription.id}/><input type="hidden" name="action" value="verify"/><SubmitButton className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">Verify prescription</SubmitButton></form><form action={submit} className="space-y-2"><input type="hidden" name="prescription_id" value={prescription.id}/><input type="hidden" name="action" value="reject"/><textarea name="reason" required maxLength={1000} placeholder="Required rejection reason" className="w-full rounded-xl border border-slate-300 p-3 text-sm"/><SubmitButton className="w-full rounded-xl border border-red-300 px-4 py-3 font-semibold text-red-700">Reject with reason</SubmitButton></form></div>}
    {prescription.pharmacy_status === 'verified' && <form action={submit} className="mt-5"><input type="hidden" name="prescription_id" value={prescription.id}/><input type="hidden" name="action" value="mark_for_dispensing"/><SubmitButton className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white">Mark for dispensing</SubmitButton></form>}
    {prescription.pharmacy_status === 'ready_for_dispensing' && <Link href={`/pharmacist/dispensing?prescription=${prescription.id}`} className="mt-5 block rounded-xl bg-blue-600 px-4 py-3 text-center font-semibold text-white">Open dispensing</Link>}
    {prescription.pharmacy_status === 'rejected' && <div className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Rejected</p><p className="mt-1">{prescription.rejection_reason}</p></div>}
    {prescription.pharmacy_status === 'dispensed' && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">This prescription has been fully dispensed. Duplicate dispensing is blocked.</p>}
  </aside>
}
