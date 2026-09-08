'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, PackageCheck, PackagePlus, Pill, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { addInventoryAction, adjustInventoryAction } from '@/app/actions/pharmacist'
import SubmitButton from '@/components/SubmitButton'
import StockBatchFields from '@/components/pharmacy/StockBatchFields'
import { currentMedicineStock } from '@/lib/inventoryQuantity'
import { useToast } from '@/components/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, PageHeader, StatCard, StatusBadge } from '@/components/ui/HmsUI'
import type { InventoryBatch, InventorySummary, Medicine, MedicineCategory, Supplier } from '@/lib/pharmacistTypes'

type StockFilter = '' | InventoryBatch['stock_status']

export default function InventoryWorkspace({ inventory, summary, medicines, categories, suppliers }: { inventory: InventoryBatch[]; summary: InventorySummary; medicines: Medicine[]; categories: MedicineCategory[]; suppliers: Supplier[] }) {
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [selectedMedicineId, setSelectedMedicineId] = useState('')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [stockStatus, setStockStatus] = useState<StockFilter>('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { showToast } = useToast()

  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh() }
    const timer = window.setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [router])

  useEffect(() => { if (!receiveOpen) setSelectedMedicineId('') }, [receiveOpen])

  const filtered = useMemo(() => inventory.filter(batch => {
    const haystack = `${batch.medicine_name} ${batch.generic_name || ''} ${batch.sku || ''} ${batch.batch_number} ${batch.supplier_name || ''}`.toLowerCase()
    return haystack.includes(search.toLowerCase())
      && (!categoryId || String(batch.category_id) === categoryId)
      && (!supplierId || String(batch.supplier_id) === supplierId)
      && (!stockStatus || batch.stock_status === stockStatus)
  }), [categoryId, inventory, search, stockStatus, supplierId])

  async function receive(data: FormData) {
    setError('')
    const response = await addInventoryAction(data)
    if (response.error) return setError(response.error)
    setReceiveOpen(false)
    showToast('Stock batch received and transaction recorded.', 'success')
    router.refresh()
  }
  async function adjust(data: FormData) {
    const response = await adjustInventoryAction(data)
    if (response.error) showToast(response.error, 'error')
    else { showToast('Audited stock adjustment recorded.', 'success'); router.refresh() }
  }
  const emptyMessage = stockStatus === 'low_stock'
    ? 'No medicines are currently below the stock threshold.'
    : stockStatus === 'expiring_soon'
      ? 'No medicines are expiring soon.'
      : stockStatus === 'expired'
        ? 'No expired medicine batches are currently held.'
        : 'No inventory available.'

  return <div className="space-y-7">
    <p className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">Shared hospital stock: Admin-entered batches appear here automatically. No duplicate entry is needed. Updates refresh every 30 seconds and when you return to this tab.</p>
    <PageHeader eyebrow="Pharmacy operations" title="Medicine inventory" description="Manage physical stock, batches, expiry, availability, and audited adjustments." actions={<><button type="button" onClick={() => setReceiveOpen(true)} className="hms-button hms-button-primary"><PackagePlus className="h-4 w-4" />Receive stock</button><button type="button" onClick={() => setStockStatus('low_stock')} className="hms-button hms-button-secondary">Low stock</button><button type="button" onClick={() => setStockStatus('expiring_soon')} className="hms-button hms-button-secondary">Expiring soon</button></>} />
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Inventory summary"><StatCard label="Total medicines" value={summary.total_medicines} icon={Pill} /><StatCard label="Total stock quantity" value={summary.total_stock_quantity} icon={PackageCheck} tone="success" /><StatCard label="Low stock items" value={summary.low_stock_items} icon={AlertTriangle} tone="warning" /><StatCard label="Expiring soon" value={summary.expiring_soon} icon={CalendarClock} helper={`Within ${summary.expiry_warning_days} days`} tone="warning" /><StatCard label="Expired batches" value={summary.expired_batches} icon={AlertTriangle} tone="danger" /></section>
    <section className="hms-card overflow-hidden">
      <div className="border-b p-4 sm:p-5"><div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_14rem_14rem_13rem]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search medicine, SKU, batch or supplier..." className="hms-input pl-10" /></label><select value={categoryId} onChange={event => setCategoryId(event.target.value)} className="hms-input"><option value="">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={supplierId} onChange={event => setSupplierId(event.target.value)} className="hms-input"><option value="">All suppliers</option>{Array.from(new Map(inventory.filter(x => x.supplier_id).map(x => [x.supplier_id, x.supplier_name])).entries()).map(([id, name]) => <option key={id} value={id || ''}>{name}</option>)}</select><select value={stockStatus} onChange={event => setStockStatus(event.target.value as StockFilter)} className="hms-input"><option value="">All stock statuses</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="expiring_soon">Expiring soon</option><option value="expired">Expired</option><option value="out_of_stock">Out of stock</option></select></div></div>
      {filtered.length === 0 ? <EmptyState title={inventory.length === 0 ? 'No inventory available' : 'No matching stock'} description={inventory.length === 0 ? 'Receive a stock batch after Admin creates active categories, medicines, and suppliers.' : emptyMessage} action={inventory.length === 0 ? <button type="button" onClick={() => setReceiveOpen(true)} className="hms-button hms-button-primary">Receive stock</button> : undefined} /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-4">Medicine</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Batch / supplier</th><th className="px-4 py-4">Quantity</th><th className="px-4 py-4">Expiry</th><th className="px-4 py-4">Prices</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Action</th></tr></thead><tbody className="divide-y">{filtered.map(batch => <tr key={batch.id} className={batch.stock_status === 'expired' ? 'bg-rose-50/60' : batch.stock_status === 'expiring_soon' ? 'bg-amber-50/50' : ''}><td className="px-4 py-4"><p className="font-semibold">{batch.medicine_name}</p><p className="text-xs text-slate-500">{batch.generic_name || 'No generic'} · {batch.sku || 'No SKU'}</p></td><td className="px-4 py-4"><p>{batch.category_name || '—'}</p><p className="text-xs text-slate-500">{batch.unit || 'Unit not set'}</p></td><td className="px-4 py-4"><p className="font-medium">{batch.batch_number}</p><p className="text-xs text-slate-500">{batch.supplier_name || 'Historical supplier unavailable'}</p></td><td className="px-4 py-4"><p className="font-semibold">{batch.available_quantity} / {batch.quantity}</p><p className="text-xs text-slate-500">Minimum {batch.minimum_stock_level}</p></td><td className="whitespace-nowrap px-4 py-4">{new Date(`${batch.expiry_date}T00:00:00`).toLocaleDateString()}</td><td className="whitespace-nowrap px-4 py-4"><p>Buy ₹{batch.purchase_price}</p><p className="text-xs text-slate-500">Sell ₹{batch.selling_price}</p></td><td className="px-4 py-4"><StatusBadge status={batch.stock_status} /></td><td className="px-4 py-4"><form action={adjust} className="flex min-w-[25rem] gap-2"><input type="hidden" name="batch_id" value={batch.id} /><select name="action" className="rounded-lg border px-2"><option value="add_stock">Add stock</option><option value="update_stock">Count correction</option><option value="expired">Record expired</option><option value="damaged">Record damaged</option></select><input name="quantity" type="number" min="1" required placeholder="Qty" className="w-20 rounded-lg border px-2" /><input name="reason" maxLength={255} required placeholder="Reason" className="w-28 rounded-lg border px-2" /><SubmitButton className="rounded-lg bg-slate-900 px-3 py-2 text-white">Record</SubmitButton></form></td></tr>)}</tbody></table></div>}
    </section>
    <Modal open={receiveOpen} onClose={() => setReceiveOpen(false)} title="Receive stock" description="Create a new batch for an existing active medicine and supplier." size="lg"><form action={receive} className="grid gap-4 sm:grid-cols-2">{error && <p role="alert" className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{medicines.length === 0 && <p className="sm:col-span-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No medicines have been added yet. Ask an Admin to create an active medicine master record.</p>}{suppliers.length === 0 && <p className="sm:col-span-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No suppliers have been added yet. Ask an Admin to create an active supplier.</p>}{selectedMedicineId && <div className="sm:col-span-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900" role="status"><p className="font-semibold">Already recorded stock: {currentMedicineStock(inventory, selectedMedicineId)} {medicines.find(item => String(item.id) === selectedMedicineId)?.unit || 'units'}</p><p>Includes stock entered by Admin. It is already in inventory; do not add it again. This total includes any expired stock; check batch expiry before dispensing.</p></div>}<StockBatchFields medicines={medicines} suppliers={suppliers} onMedicineChange={setSelectedMedicineId} /><div className="flex items-end justify-end gap-2"><button type="button" onClick={() => setReceiveOpen(false)} className="hms-button hms-button-secondary">Cancel</button><SubmitButton disabled={medicines.length === 0 || suppliers.length === 0}>Receive stock</SubmitButton></div></form></Modal>
  </div>
}
