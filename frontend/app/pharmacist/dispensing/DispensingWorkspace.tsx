'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageCheck } from 'lucide-react'

import { dispenseAction } from '@/app/actions/pharmacist'
import { useToast } from '@/components/ToastProvider'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/HmsUI'
import { ConfirmationDialog, Modal } from '@/components/ui/Modal'
import type { DispensingRecord, InventoryBatch, PharmacyPrescription } from '@/lib/pharmacistTypes'

export default function DispensingWorkspace({ prescriptions, inventory, records, initialPrescription }: { prescriptions: PharmacyPrescription[]; inventory: InventoryBatch[]; records: DispensingRecord[]; initialPrescription: string }) {
  const validInitial = prescriptions.some(item => String(item.id) === initialPrescription) ? initialPrescription : ''
  const [prescriptionId, setPrescriptionId] = useState(validInitial)
  const [batchId, setBatchId] = useState('')
  const [dispenseOpen, setDispenseOpen] = useState(Boolean(validInitial))
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const { showToast } = useToast()

  const prescription = prescriptions.find(item => String(item.id) === prescriptionId)
  const validInventory = useMemo(() => inventory.filter(batch =>
    batch.available_quantity > 0
    && batch.medicine_status === 'active'
    && batch.category_status === 'active'
    && batch.supplier_status !== 'inactive',
  ), [inventory])
  const matching = useMemo(() => validInventory.filter(batch => {
    if (!prescription?.medicine) return false
    const prescribed = prescription.medicine.trim().toLowerCase()
    return batch.medicine_name.trim().toLowerCase() === prescribed
      || batch.generic_name?.trim().toLowerCase() === prescribed
  }), [prescription, validInventory])
  const batch = matching.find(item => String(item.id) === batchId)

  function openDispensing(id: number) {
    setPrescriptionId(String(id))
    setBatchId('')
    setDispenseOpen(true)
  }

  async function confirmDispense() {
    if (!formRef.current || pending) return
    setPending(true)
    try {
      const response = await dispenseAction(new FormData(formRef.current))
      if (response.error) {
        showToast(response.error, 'error')
        return
      }
      showToast('Medicine dispensed and inventory reduced successfully.', 'success')
      setConfirmOpen(false)
      setDispenseOpen(false)
      setPrescriptionId('')
      setBatchId('')
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return <div className="space-y-7">
    <PageHeader eyebrow="Pharmacy operations" title="Dispensing workspace" description="Dispense only verified prescriptions from valid, available stock batches." />

    <section className="hms-card overflow-hidden">
      <div className="border-b p-5"><h2 className="text-xl font-semibold">Ready to dispense</h2><p className="mt-1 text-sm text-slate-500">Availability excludes expired and unavailable stock.</p></div>
      {prescriptions.length === 0 ? <EmptyState title="No prescriptions are ready for dispensing" description="Verify a prescription and mark it ready before dispensing." /> : <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Prescription</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Medicine</th><th className="px-5 py-4">Required</th><th className="px-5 py-4">Available</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Action</th></tr></thead><tbody className="divide-y">{prescriptions.map(item => <tr key={item.id}><td className="px-5 py-4 font-semibold">#{item.id}</td><td className="px-5 py-4">{item.patient_name}</td><td className="px-5 py-4">{item.medicine || 'Not specified'}</td><td className="px-5 py-4">{item.quantity ?? 'Legacy record'}</td><td className="px-5 py-4"><span className={item.available_quantity === 0 ? 'font-semibold text-rose-700' : item.quantity && item.available_quantity < item.quantity ? 'font-semibold text-amber-700' : 'font-semibold text-emerald-700'}>{item.available_quantity}</span></td><td className="px-5 py-4"><StatusBadge status={item.pharmacy_status} /></td><td className="px-5 py-4"><button type="button" onClick={() => openDispensing(item.id)} className="hms-button hms-button-primary">Dispense</button></td></tr>)}</tbody></table></div>}
    </section>

    <section className="hms-card overflow-hidden">
      <div className="border-b p-5"><h2 className="text-xl font-semibold">Recent dispensing</h2><p className="mt-1 text-sm text-slate-500">Completed, pharmacist-attributed dispensing history.</p></div>
      {records.length === 0 ? <EmptyState title="No medicines have been dispensed" description="Completed dispensing records will appear here." /> : <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Medicine</th><th className="px-5 py-4">Batch</th><th className="px-5 py-4">Quantity</th><th className="px-5 py-4">Pharmacist</th><th className="px-5 py-4">Date / time</th></tr></thead><tbody className="divide-y">{records.map(item => <tr key={`${item.id}-${item.batch_id}`}><td className="px-5 py-4"><p className="font-semibold">{item.patient_name}</p><p className="text-xs text-slate-500">Prescription #{item.prescription_id}</p></td><td className="px-5 py-4">{item.medicine_name}</td><td className="px-5 py-4 font-medium">{item.batch_number}</td><td className="px-5 py-4">{item.quantity}</td><td className="px-5 py-4">{item.pharmacist_name}</td><td className="whitespace-nowrap px-5 py-4">{new Date(item.dispensed_at).toLocaleString()}</td></tr>)}</tbody></table></div>}
    </section>

    <Modal open={dispenseOpen} onClose={() => { if (!pending) setDispenseOpen(false) }} title="Dispense prescription" description="Select one valid batch and confirm the exact quantity." size="lg">
      {prescription && <form ref={formRef} onSubmit={event => { event.preventDefault(); setConfirmOpen(true) }} className="grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="prescription_id" value={prescription.id} />
        <div className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><p className="font-semibold">Prescription #{prescription.id} · {prescription.patient_name}</p><p className="mt-1">{prescription.medicine || 'Medicine not specified'} · Required quantity: {prescription.quantity ?? 'not recorded on legacy prescription'} · Available: {prescription.available_quantity}</p></div>
        <label className="sm:col-span-2 text-sm font-semibold">Valid stock batch<select name="batch_id" required value={batchId} onChange={event => setBatchId(event.target.value)} className="hms-input mt-1"><option value="">Select batch</option>{matching.map(item => <option key={item.id} value={item.id}>{item.batch_number} · {item.available_quantity} available · expires {item.expiry_date}</option>)}</select></label>
        <input type="hidden" name="medicine_id" value={batch?.medicine_id || ''} />
        <label className="text-sm font-semibold">Dispensing quantity<input key={`${prescription.id}-${batchId}`} name="quantity" type="number" min="1" max={batch?.available_quantity} defaultValue={prescription.quantity ?? undefined} required className="hms-input mt-1" /></label>
        <div className="flex items-end"><button type="submit" disabled={!batchId || pending} className="hms-button hms-button-primary w-full"><PackageCheck className="h-4 w-4" />Review dispensing</button></div>
        {matching.length === 0 && <p className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No eligible batch is available for this medicine. Expired, empty, inactive-medicine, inactive-category, and inactive-supplier batches cannot be selected.</p>}
      </form>}
    </Modal>

    <ConfirmationDialog open={confirmOpen} title="Confirm medicine dispensing?" description={`This will atomically reduce batch ${batch?.batch_number || ''} and permanently complete prescription #${prescription?.id || ''}.`} confirmLabel="Dispense medicine" cancelLabel="Review selection" pending={pending} onConfirm={confirmDispense} onClose={() => { if (!pending) setConfirmOpen(false) }} />
  </div>
}
