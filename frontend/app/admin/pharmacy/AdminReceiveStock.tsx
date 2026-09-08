'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { receiveAdminStockAction } from '@/app/actions/adminPharmacy'
import { Modal } from '@/components/ui/Modal'
import SubmitButton from '@/components/SubmitButton'
import StockBatchFields from '@/components/pharmacy/StockBatchFields'
import { useToast } from '@/components/ToastProvider'
import type { Medicine, Supplier } from '@/lib/pharmacistTypes'

export default function AdminReceiveStock({ medicines, suppliers }: { medicines: Medicine[]; suppliers: Supplier[] }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { showToast } = useToast()
  const activeMedicines = medicines.filter(item => item.status === 'active')
  const activeSuppliers = suppliers.filter(item => item.status === 'active')
  async function save(data: FormData) {
    setError('')
    const result = await receiveAdminStockAction(data)
    if (result.error) return setError(result.error)
    setOpen(false)
    showToast('Stock saved. Pharmacist inventory uses this same quantity; no second entry is needed.', 'success')
    router.refresh()
  }
  return <>
    <button type="button" onClick={() => { setError(''); setOpen(true) }} className="hms-button hms-button-secondary">Add actual stock</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Add actual stock" description="Save a stock batch once. It appears automatically in Pharmacist inventory." size="lg">
      <form action={save} className="grid gap-4 sm:grid-cols-2">
        <p className="sm:col-span-2 rounded-xl bg-teal-50 p-3 text-sm text-teal-900">This is physical inventory quantity, not the minimum-stock alert threshold. Enter the real batch and expiry details.</p>
        {error && <p role="alert" className="sm:col-span-2 text-sm text-rose-700">{error}</p>}
        {(!activeMedicines.length || !activeSuppliers.length) && <p className="sm:col-span-2 text-sm text-amber-700">Create an active medicine and supplier first.</p>}
        <StockBatchFields medicines={activeMedicines} suppliers={activeSuppliers} />
        <div className="flex items-end justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="hms-button hms-button-secondary">Cancel</button><SubmitButton disabled={!activeMedicines.length || !activeSuppliers.length}>Save stock</SubmitButton></div>
      </form>
    </Modal>
  </>
}
