'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, PackageCheck, PackagePlus, Pill, Search, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { addInventoryAction, adjustInventoryAction } from '@/app/actions/pharmacist'
import SubmitButton from '@/components/SubmitButton'
import StockBatchFields from '@/components/pharmacy/StockBatchFields'
import { useToast } from '@/components/ToastProvider'
import { EmptyState, PageHeader, StatCard, StatusBadge } from '@/components/ui/HmsUI'
import { Modal } from '@/components/ui/Modal'
import { currentMedicineStock } from '@/lib/inventoryQuantity'
import type { InventoryBatch, InventorySummary, Medicine, MedicineCategory, Supplier } from '@/lib/pharmacistTypes'

type StockFilter = '' | InventoryBatch['stock_status']
type AdjustmentAction = 'add_stock' | 'update_stock' | 'expired' | 'damaged'

interface InventoryWorkspaceProps {
  inventory: InventoryBatch[]
  summary: InventorySummary
  medicines: Medicine[]
  categories: MedicineCategory[]
  suppliers: Supplier[]
}

export default function InventoryWorkspace({ inventory, summary, medicines, categories, suppliers }: InventoryWorkspaceProps) {
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [selectedMedicineId, setSelectedMedicineId] = useState('')
  const [adjustBatchId, setAdjustBatchId] = useState<number | null>(null)
  const [adjustmentAction, setAdjustmentAction] = useState<AdjustmentAction>('update_stock')
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [stockStatus, setStockStatus] = useState<StockFilter>('')
  const [error, setError] = useState('')
  const router = useRouter()
  const { showToast } = useToast()
  const adjustmentBatch = inventory.find(batch => batch.id === adjustBatchId)

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

  useEffect(() => {
    if (!receiveOpen) setSelectedMedicineId('')
  }, [receiveOpen])

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
    if (response.error) {
      setError(response.error)
      return
    }
    setReceiveOpen(false)
    showToast('Stock batch received and transaction recorded.', 'success')
    router.refresh()
  }

  async function adjust(data: FormData) {
    const response = await adjustInventoryAction(data)
    if (response.error) {
      showToast(response.error, 'error')
      return
    }
    showToast('Audited stock adjustment recorded.', 'success')
    setAdjustBatchId(null)
    router.refresh()
  }

  const emptyMessage = stockStatus === 'low_stock'
    ? 'No medicines are currently below their minimum stock level.'
    : stockStatus === 'expiring_soon'
      ? 'No medicines are expiring soon.'
      : stockStatus === 'expired'
        ? 'No expired medicine batches are currently held.'
        : 'No inventory available.'

  return <div className="space-y-7">
    <p className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900">Shared hospital stock: Admin-entered batches appear here automatically. No duplicate entry is needed. Updates refresh every 30 seconds and when you return to this tab.</p>
    <PageHeader
      eyebrow="Pharmacy operations"
      title="Pharmacy inventory"
      description="Manage physical stock, batches, expiry, availability, and audited adjustments."
      actions={<>
        <button type="button" onClick={() => setReceiveOpen(true)} className="hms-button hms-button-primary"><PackagePlus className="h-4 w-4" />Receive stock</button>
        <button type="button" onClick={() => setStockStatus('low_stock')} className="hms-button hms-button-secondary">Low stock</button>
        <button type="button" onClick={() => setStockStatus('expiring_soon')} className="hms-button hms-button-secondary">Expiring soon</button>
      </>}
    />

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5" aria-label="Inventory summary">
      <StatCard label="Active medicines" value={summary.total_medicines} icon={Pill} />
      <StatCard label="Actual usable stock" value={summary.total_stock_quantity} icon={PackageCheck} tone="success" />
      <StatCard label="Low stock" value={summary.low_stock_items} icon={AlertTriangle} tone="warning" />
      <StatCard label="Expiring soon" value={summary.expiring_soon} icon={CalendarClock} helper={`Within ${summary.expiry_warning_days} days`} tone="warning" />
      <StatCard label="Expired" value={summary.expired_batches} icon={AlertTriangle} tone="danger" />
    </section>

    <section className="hms-card overflow-hidden">
      <div className="border-b p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_14rem_14rem_13rem]">
          <label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search medicine, SKU, batch or supplier..." className="hms-input pl-10" /></label>
          <select aria-label="Filter by category" value={categoryId} onChange={event => setCategoryId(event.target.value)} className="hms-input"><option value="">All categories</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select aria-label="Filter by supplier" value={supplierId} onChange={event => setSupplierId(event.target.value)} className="hms-input"><option value="">All suppliers</option>{Array.from(new Map(inventory.filter(item => item.supplier_id).map(item => [item.supplier_id, item.supplier_name])).entries()).map(([id, name]) => <option key={id} value={id || ''}>{name}</option>)}</select>
          <select aria-label="Filter by stock status" value={stockStatus} onChange={event => setStockStatus(event.target.value as StockFilter)} className="hms-input"><option value="">All stock statuses</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option><option value="expiring_soon">Expiring soon</option><option value="expired">Expired</option><option value="out_of_stock">Out of stock</option></select>
        </div>
      </div>
      {filtered.length === 0 ? <EmptyState
        title={inventory.length === 0 ? 'No inventory available' : 'No matching stock'}
        description={inventory.length === 0 ? 'Receive a stock batch after Admin creates active categories, medicines, and suppliers.' : emptyMessage}
        action={inventory.length === 0 ? <button type="button" onClick={() => setReceiveOpen(true)} className="hms-button hms-button-primary">Receive stock</button> : undefined}
      /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-4">Medicine</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Batch / supplier</th><th className="px-4 py-4">Quantity</th><th className="px-4 py-4">Expiry</th><th className="px-4 py-4">Purchase price</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">Action</th></tr></thead><tbody className="divide-y">{filtered.map(batch => <tr key={batch.id} className={batch.stock_status === 'expired' ? 'bg-rose-50/60' : batch.stock_status === 'expiring_soon' ? 'bg-amber-50/50' : ''}>
        <td className="px-4 py-4"><p className="font-semibold">{batch.medicine_name}</p><p className="text-xs text-slate-500">{batch.generic_name || 'No generic'} · {batch.sku || 'No SKU'}</p></td>
        <td className="px-4 py-4"><p>{batch.category_name || '—'}</p><p className="text-xs text-slate-500">{batch.unit || 'Unit not set'}</p></td>
        <td className="px-4 py-4"><p className="font-medium">{batch.batch_number}</p><p className="text-xs text-slate-500">{batch.supplier_name || 'Historical supplier unavailable'}</p></td>
        <td className="px-4 py-4"><p className="font-semibold">{batch.available_quantity} / {batch.quantity}</p><p className="text-xs text-slate-500">Minimum {batch.minimum_stock_level}</p></td>
        <td className="whitespace-nowrap px-4 py-4">{new Date(`${batch.expiry_date}T00:00:00`).toLocaleDateString()}</td>
        <td className="whitespace-nowrap px-4 py-4">₹{batch.purchase_price}</td>
        <td className="px-4 py-4"><StatusBadge status={batch.stock_status} /></td>
        <td className="px-4 py-4"><button type="button" onClick={() => { setAdjustmentAction('update_stock'); setAdjustBatchId(batch.id) }} className="hms-button hms-button-secondary whitespace-nowrap"><SlidersHorizontal className="h-4 w-4" />Adjust stock</button></td>
      </tr>)}</tbody></table></div>}
    </section>

    <Modal open={receiveOpen} onClose={() => setReceiveOpen(false)} title="Receive stock" description="Create a new batch for an existing active medicine and supplier." size="lg">
      <form action={receive} className="grid gap-4 sm:grid-cols-2">
        {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {medicines.length === 0 && <p className="sm:col-span-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No active medicines are available. Ask an Admin to create or activate the medicine master record.</p>}
        {suppliers.length === 0 && <p className="sm:col-span-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">No active suppliers are available. Ask an Admin to create or activate a supplier.</p>}
        {selectedMedicineId && <div className="sm:col-span-2 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900" role="status"><p className="font-semibold">Already recorded physical stock: {currentMedicineStock(inventory, selectedMedicineId)} {medicines.find(item => String(item.id) === selectedMedicineId)?.unit || 'units'}</p><p>This includes Admin-entered and expired batches. The usable-stock summary excludes expired stock.</p></div>}
        <StockBatchFields medicines={medicines} suppliers={suppliers} onMedicineChange={setSelectedMedicineId} />
        <div className="flex items-end justify-end gap-2"><button type="button" onClick={() => setReceiveOpen(false)} className="hms-button hms-button-secondary">Cancel</button><SubmitButton disabled={medicines.length === 0 || suppliers.length === 0}>Receive stock</SubmitButton></div>
      </form>
    </Modal>

    <Modal open={Boolean(adjustmentBatch)} onClose={() => setAdjustBatchId(null)} title="Audited stock adjustment" description="Every change creates both a stock transaction and audit event." size="sm">
      {adjustmentBatch && <form action={adjust} className="space-y-4">
        <input type="hidden" name="batch_id" value={adjustmentBatch.id} />
        <div className="rounded-xl bg-slate-50 p-4 text-sm"><p className="font-semibold">{adjustmentBatch.medicine_name} · {adjustmentBatch.batch_number}</p><p className="mt-1 text-slate-600">Current available quantity: {adjustmentBatch.available_quantity}</p></div>
        <label className="block text-sm font-semibold">Adjustment type<select name="action" value={adjustmentAction} onChange={event => setAdjustmentAction(event.target.value as AdjustmentAction)} className="hms-input mt-1"><option value="add_stock">Add stock</option><option value="update_stock">Count correction</option><option value="expired">Record expired</option><option value="damaged">Record damaged</option></select></label>
        <label className="block text-sm font-semibold">{adjustmentAction === 'update_stock' ? 'Counted quantity' : 'Adjustment quantity'}<input name="quantity" type="number" min={adjustmentAction === 'update_stock' ? 0 : 1} required className="hms-input mt-1" /></label>
        <label className="block text-sm font-semibold">Reason<input name="reason" minLength={2} maxLength={255} required placeholder="Required for the audit trail" className="hms-input mt-1" /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setAdjustBatchId(null)} className="hms-button hms-button-secondary">Cancel</button><SubmitButton>Record adjustment</SubmitButton></div>
      </form>}
    </Modal>
  </div>
}
