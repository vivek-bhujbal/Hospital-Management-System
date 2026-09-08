'use client'

import { useMemo, useState, useTransition } from 'react'
import { Boxes, PackagePlus, Pencil, Pill, Power, Search, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { saveCategoryAction, saveMedicineAction, saveSupplierAction, setMasterStatusAction } from '@/app/actions/adminPharmacy'
import SubmitButton from '@/components/SubmitButton'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, PageHeader, StatCard, StatusBadge } from '@/components/ui/HmsUI'
import { useToast } from '@/components/ToastProvider'
import type { Medicine, MedicineCategory, Supplier } from '@/lib/pharmacistTypes'

import MedicineFields from './MedicineFields'
import AdminReceiveStock from './AdminReceiveStock'

type Tab = 'suppliers' | 'categories' | 'medicines'
type Editable = Supplier | MedicineCategory | Medicine

const tabs: Array<{ id: Tab; label: string; icon: typeof Truck }> = [
  { id: 'suppliers', label: 'Suppliers', icon: Truck },
  { id: 'categories', label: 'Categories', icon: Boxes },
  { id: 'medicines', label: 'Medicines', icon: Pill },
]

export default function PharmacyMasterWorkspace({ suppliers, categories, medicines, specializations }: { suppliers: Supplier[]; categories: MedicineCategory[]; medicines: Medicine[]; specializations: string[] }) {
  const [tab, setTab] = useState<Tab>('suppliers')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [editing, setEditing] = useState<Editable | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const { showToast } = useToast()

  const source = tab === 'suppliers' ? suppliers : tab === 'categories' ? categories : medicines
  const filtered = useMemo(() => source.filter(item => {
    const haystack = tab === 'suppliers'
      ? `${(item as Supplier).name} ${(item as Supplier).contact_person || ''} ${(item as Supplier).email || ''} ${(item as Supplier).phone || ''}`
      : tab === 'categories'
        ? `${item.name} ${(item as MedicineCategory).description || ''}`
        : `${item.name} ${(item as Medicine).generic_name || ''} ${(item as Medicine).sku || ''} ${(item as Medicine).category_name || ''}`
    return haystack.toLowerCase().includes(search.toLowerCase()) && (!status || item.status === status)
  }), [search, source, status, tab])

  function openCreate() { setEditing(null); setError(''); setModalOpen(true) }
  function openEdit(item: Editable) { setEditing(item); setError(''); setModalOpen(true) }
  async function save(data: FormData) {
    setError('')
    const action = tab === 'suppliers' ? saveSupplierAction : tab === 'categories' ? saveCategoryAction : saveMedicineAction
    const result = await action(data)
    if (result.error) return setError(result.error)
    setModalOpen(false)
    showToast(`${tab.slice(0, -1)} saved successfully.`, 'success')
    router.refresh()
  }
  function toggle(item: Editable) {
    startTransition(async () => {
      const next = item.status === 'active' ? 'inactive' : 'active'
      const result = await setMasterStatusAction(tab, item.id, next)
      if (result.error) showToast(result.error, 'error')
      else { showToast(`${item.name} is now ${next}.`, 'success'); router.refresh() }
    })
  }

  return <div className="space-y-7">
    <PageHeader eyebrow="Admin · Pharmacy management" title="Pharmacy master data" description="Manage hospital-wide suppliers, medicine categories, and reusable medicine records. Pharmacists use these records when receiving stock." actions={<><AdminReceiveStock medicines={medicines} suppliers={suppliers} /><button type="button" onClick={openCreate} className="hms-button hms-button-primary"><PackagePlus className="h-4 w-4" />Add {tab.slice(0, -1)}</button></>} />
    <section className="grid gap-4 sm:grid-cols-3"><StatCard label="Suppliers" value={suppliers.length} icon={Truck} helper={`${suppliers.filter(x => x.status === 'active').length} active`} /><StatCard label="Categories" value={categories.length} icon={Boxes} helper={`${categories.filter(x => x.status === 'active').length} active`} /><StatCard label="Medicines" value={medicines.length} icon={Pill} helper={`${medicines.filter(x => x.status === 'active').length} active`} /></section>
    <section className="hms-card overflow-hidden">
      <div className="border-b p-4 sm:p-5"><div className="flex flex-wrap gap-2">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => { setTab(item.id); setSearch(''); setStatus('') }} className={`hms-button ${tab === item.id ? 'hms-button-primary' : 'hms-button-secondary'}`}><Icon className="h-4 w-4" />{item.label}</button> })}</div><div className="mt-4 grid gap-3 sm:grid-cols-[1fr_12rem]"><label className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={`Search ${tab}...`} className="hms-input pl-10" /></label><select value={status} onChange={event => setStatus(event.target.value)} className="hms-input"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div></div>
      {filtered.length === 0 ? <EmptyState title={`No ${tab} found`} description={source.length === 0 ? `No ${tab} have been added yet.` : 'No records match the current search and status filter.'} action={<button type="button" onClick={openCreate} className="hms-button hms-button-primary">Add {tab.slice(0, -1)}</button>} /> : <div className="overflow-x-auto">
        {tab === 'suppliers' && <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Supplier</th><th className="px-5 py-4">Contact</th><th className="px-5 py-4">Address</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y">{(filtered as Supplier[]).map(item => <tr key={item.id}><td className="px-5 py-4"><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">Created {new Date(item.created_at).toLocaleDateString()}</p></td><td className="px-5 py-4"><p>{item.contact_person || '—'}</p><p className="text-xs text-slate-500">{item.phone || 'No phone'} · {item.email || 'No email'}</p></td><td className="max-w-xs px-5 py-4 text-slate-600">{item.address || '—'}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="px-5 py-4 text-slate-500">{new Date(item.updated_at || item.created_at).toLocaleString()}</td><td className="px-5 py-4"><RowActions item={item} pending={pending} edit={openEdit} toggle={toggle} /></td></tr>)}</tbody></table>}
        {tab === 'categories' && <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Category</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y">{(filtered as MedicineCategory[]).map(item => <tr key={item.id}><td className="px-5 py-4 font-semibold">{item.name}</td><td className="max-w-lg px-5 py-4 text-slate-600">{item.description || '—'}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="px-5 py-4 text-slate-500">{new Date(item.updated_at || item.created_at).toLocaleString()}</td><td className="px-5 py-4"><RowActions item={item} pending={pending} edit={openEdit} toggle={toggle} /></td></tr>)}</tbody></table>}
        {tab === 'medicines' && <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Medicine</th><th className="px-5 py-4">SKU</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Unit / minimum</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y">{(filtered as Medicine[]).map(item => <tr key={item.id}><td className="px-5 py-4"><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.generic_name || 'Generic name not specified'}</p></td><td className="px-5 py-4 font-mono text-xs">{item.sku || '—'}</td><td className="px-5 py-4">{item.category_name || '—'}</td><td className="px-5 py-4"><p>{item.unit || '—'}</p><p className="text-xs text-slate-500">Minimum {item.minimum_stock_level}</p></td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="px-5 py-4"><RowActions item={item} pending={pending} edit={openEdit} toggle={toggle} /></td></tr>)}</tbody></table>}
      </div>}
    </section>
    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`${editing ? 'Edit' : 'Add'} ${tab.slice(0, -1)}`} description="Changes apply to hospital-wide pharmacy master data." size="lg"><form action={save} className="grid gap-4 sm:grid-cols-2">{editing && <input type="hidden" name="id" value={editing.id} />}{error && <p role="alert" className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{tab === 'suppliers' && <SupplierFields item={editing as Supplier | null} />}{tab === 'categories' && <CategoryFields item={editing as MedicineCategory | null} />}{tab === 'medicines' && <MedicineFields item={editing as Medicine | null} categories={categories} medicines={medicines} specializations={specializations} />}<div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2"><button type="button" onClick={() => setModalOpen(false)} className="hms-button hms-button-secondary">Cancel</button><SubmitButton>Save {tab.slice(0, -1)}</SubmitButton></div></form></Modal>
  </div>
}

function RowActions({ item, pending, edit, toggle }: { item: Editable; pending: boolean; edit: (item: Editable) => void; toggle: (item: Editable) => void }) { return <div className="flex justify-end gap-2"><button type="button" onClick={() => edit(item)} className="hms-button hms-button-secondary min-h-9 px-3 py-2"><Pencil className="h-4 w-4" />Edit</button><button type="button" disabled={pending} onClick={() => toggle(item)} className="hms-button hms-button-secondary min-h-9 px-3 py-2"><Power className="h-4 w-4" />{item.status === 'active' ? 'Deactivate' : 'Activate'}</button></div> }
function Field({ label, name, defaultValue = '', required = false, type = 'text', ...props }: { label: string; name: string; defaultValue?: string | number; required?: boolean; type?: string; [key: string]: unknown }) { return <label><span className="mb-1.5 block text-sm font-semibold">{label}</span><input name={name} type={type} defaultValue={defaultValue} required={required} className="hms-input" {...props} /></label> }
function StatusField({ value = 'active' }: { value?: string }) { return <label><span className="mb-1.5 block text-sm font-semibold">Status</span><select name="status" defaultValue={value} className="hms-input"><option value="active">Active</option><option value="inactive">Inactive</option></select></label> }
function SupplierFields({ item }: { item: Supplier | null }) { return <><Field label="Supplier name" name="name" defaultValue={item?.name} required maxLength={150} /><Field label="Contact person" name="contact_person" defaultValue={item?.contact_person || ''} maxLength={100} /><Field label="Phone" name="phone" type="tel" defaultValue={item?.phone || ''} pattern="[0-9+() -]{7,20}" /><Field label="Email" name="email" type="email" defaultValue={item?.email || ''} /><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Address</span><textarea name="address" defaultValue={item?.address || ''} maxLength={1000} rows={3} className="hms-input" /></label><StatusField value={item?.status} /></> }
function CategoryFields({ item }: { item: MedicineCategory | null }) { return <><Field label="Category name" name="name" defaultValue={item?.name} required maxLength={100} /><StatusField value={item?.status} /><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Description</span><textarea name="description" defaultValue={item?.description || ''} maxLength={1000} rows={4} className="hms-input" /></label></> }
