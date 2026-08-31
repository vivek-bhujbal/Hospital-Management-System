'use client'
import { useMemo, useState } from 'react'
import { dispenseAction } from '@/app/actions/pharmacist'
import SubmitButton from '@/components/SubmitButton'
import type { DispensingRecord, InventoryBatch, PharmacyPrescription } from '@/lib/pharmacistTypes'

export default function DispensingWorkspace({ prescriptions, inventory, records, initialPrescription }: { prescriptions: PharmacyPrescription[]; inventory: InventoryBatch[]; records: DispensingRecord[]; initialPrescription: string }) {
  const validInitial = prescriptions.some(item => String(item.id) === initialPrescription) ? initialPrescription : ''
  const [prescriptionId, setPrescriptionId] = useState(validInitial)
  const [batchId, setBatchId] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const prescription = prescriptions.find(item => String(item.id) === prescriptionId)
  const matching = useMemo(() => inventory.filter(batch => {
    if (!prescription?.medicine) return true
    const prescribed = prescription.medicine.trim().toLowerCase()
    return batch.medicine_name.trim().toLowerCase() === prescribed
  }), [inventory, prescription])
  const batch = inventory.find(item => String(item.id) === batchId)
  async function submit(data: FormData) {
    setError(''); setSuccess('')
    const response = await dispenseAction(data)
    if (response.error) setError(response.error)
    else { setSuccess('Medicine dispensed and inventory reduced successfully.'); setPrescriptionId(''); setBatchId('') }
  }
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Verification → stock check → dispense</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Dispensing</h1><p className="mt-1 text-slate-600">Only verified prescriptions marked ready can be dispensed.</p></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Dispense prescription</h2>{error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{success && <p className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{success}</p>}{prescriptions.length === 0 ? <p className="mt-5 rounded-xl bg-slate-50 p-5 text-slate-500">No prescription is ready for dispensing. Verify one from the Prescriptions page first.</p> : <form action={submit} className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Ready prescription<select name="prescription_id" required value={prescriptionId} onChange={e => { setPrescriptionId(e.target.value); setBatchId('') }} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Select prescription</option>{prescriptions.map(item => <option key={item.id} value={item.id}>#{item.id} · {item.patient_name} · {item.medicine}</option>)}</select></label><label className="text-sm font-medium">Non-expired stock batch<select name="batch_id" required value={batchId} onChange={e => setBatchId(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3"><option value="">Select batch</option>{matching.map(item => <option key={item.id} value={item.id}>{item.medicine_name} · {item.batch_number} · {item.available_quantity} available · exp {item.expiry_date}</option>)}</select></label><input type="hidden" name="medicine_id" value={batch?.medicine_id || ''}/><label className="text-sm font-medium">Quantity<input name="quantity" type="number" min="1" max={batch?.available_quantity} required className="mt-1 w-full rounded-xl border border-slate-300 p-3"/></label><div className="flex items-end"><SubmitButton disabled={!prescriptionId || !batchId} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white disabled:bg-slate-300">Confirm dispense</SubmitButton></div><div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Confirmation is final: stock is reduced atomically and this prescription cannot be dispensed twice. Expired, unavailable, inactive, or mismatched medicine is rejected by the backend.</div></form>}</section>
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-xl font-semibold">Recent dispensing audit</h2></div>{records.length === 0 ? <p className="p-8 text-center text-slate-500">No medicines have been dispensed.</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Dispensing</th><th className="px-5 py-4">Prescription</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Time</th><th className="px-5 py-4">Status</th></tr></thead><tbody className="divide-y">{records.map(item => <tr key={item.id}><td className="px-5 py-4 font-semibold">#{item.id}</td><td className="px-5 py-4">#{item.prescription_id}</td><td className="px-5 py-4">#{item.patient_id}</td><td className="px-5 py-4">{new Date(item.dispensed_at).toLocaleString()}</td><td className="px-5 py-4 capitalize text-emerald-700">{item.status}</td></tr>)}</tbody></table></div>}</section>
  </div>
}
