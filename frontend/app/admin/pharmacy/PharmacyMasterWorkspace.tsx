'use client'

import { useMemo, useState } from 'react'
import { Boxes, PackagePlus, Pencil, Pill, Power, Search, Truck } from 'lucide-react'
import { useRouter } from 'next/navigation'

import {
  saveCategoryAction,
  saveMedicineAction,
  saveSupplierAction,
  setMasterStatusAction,
} from '@/app/actions/adminPharmacy'
import SubmitButton from '@/components/SubmitButton'
import { useToast } from '@/components/ToastProvider'
import { EmptyState, PageHeader, StatCard, StatusBadge } from '@/components/ui/HmsUI'
import { ConfirmationDialog, Modal } from '@/components/ui/Modal'
import type { Medicine, MedicineCategory, Supplier } from '@/lib/pharmacistTypes'

import MedicineFields from './MedicineFields'
import PharmacyManagementNav from './PharmacyManagementNav'

export type PharmacyMasterSection = 'suppliers' | 'categories' | 'medicines'
type Editable = Supplier | MedicineCategory | Medicine

interface PharmacyMasterWorkspaceProps {
  section: PharmacyMasterSection
  suppliers?: Supplier[]
  categories?: MedicineCategory[]
  medicines?: Medicine[]
  specializations?: string[]
}

const sectionCopy = {
  suppliers: {
    singular: 'supplier',
    title: 'Suppliers',
    description: 'Manage approved pharmacy suppliers and control whether they can be used for new stock receipt.',
    icon: Truck,
  },
  categories: {
    singular: 'category',
    title: 'Medicine categories',
    description: 'Organize medicine master records while preserving category history through status changes.',
    icon: Boxes,
  },
  medicines: {
    singular: 'medicine',
    title: 'Medicines',
    description: 'Manage medicine identity, clinical discovery metadata, stock units, and low-stock alert thresholds.',
    icon: Pill,
  },
} as const

export default function PharmacyMasterWorkspace({
  section,
  suppliers = [],
  categories = [],
  medicines = [],
  specializations = [],
}: PharmacyMasterWorkspaceProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editing, setEditing] = useState<Editable | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<Editable | null>(null)
  const [statusPending, setStatusPending] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { showToast } = useToast()
  const copy = sectionCopy[section]

  const source: Editable[] = section === 'suppliers'
    ? suppliers
    : section === 'categories'
      ? categories
      : medicines

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return source.filter((item) => {
      let searchable = item.name
      if (section === 'suppliers') {
        const supplier = item as Supplier
        searchable = `${supplier.name} ${supplier.contact_person || ''} ${supplier.email || ''} ${supplier.phone || ''} ${supplier.address || ''}`
      } else if (section === 'categories') {
        const category = item as MedicineCategory
        searchable = `${category.name} ${category.description || ''}`
      } else {
        const medicine = item as Medicine
        searchable = `${medicine.name} ${medicine.generic_name || ''} ${medicine.sku || ''} ${medicine.category_name || ''} ${medicine.unit || ''}`
        if (categoryId && String(medicine.category_id) !== categoryId) return false
      }
      return searchable.toLowerCase().includes(query) && (!status || item.status === status)
    })
  }, [categoryId, search, section, source, status])

  const activeCount = source.filter((item) => item.status === 'active').length
  const assignedMedicineCount = categories.reduce(
    (total, category) => total + medicines.filter((medicine) => medicine.category_id === category.id).length,
    0,
  )

  function openCreate() {
    setEditing(null)
    setError('')
    setModalOpen(true)
  }

  function openEdit(item: Editable) {
    setEditing(item)
    setError('')
    setModalOpen(true)
  }

  async function save(data: FormData) {
    setError('')
    const result = section === 'suppliers'
      ? await saveSupplierAction(data)
      : section === 'categories'
        ? await saveCategoryAction(data)
        : await saveMedicineAction(data)
    if (result.error) {
      setError(result.error)
      return
    }
    setModalOpen(false)
    showToast(`${copy.singular[0].toUpperCase()}${copy.singular.slice(1)} saved successfully.`, 'success')
    router.refresh()
  }

  async function confirmStatusChange() {
    if (!statusTarget || statusPending) return
    const next = statusTarget.status === 'active' ? 'inactive' : 'active'
    setStatusPending(true)
    try {
      const result = await setMasterStatusAction(section, statusTarget.id, next)
      if (result.error) {
        showToast(result.error, 'error')
        return
      }
      showToast(`${statusTarget.name} is now ${next}.`, 'success')
      setStatusTarget(null)
      router.refresh()
    } finally {
      setStatusPending(false)
    }
  }

  const statusDescription = statusTarget
    ? statusTarget.status === 'active'
      ? `Deactivate ${statusTarget.name}? Historical records remain visible, but it will no longer be available for new pharmacy operations.`
      : `Activate ${statusTarget.name}? It will become available for new pharmacy operations after all related master records are active.`
    : ''

  return (
    <div className="space-y-7">
      <PharmacyManagementNav />
      <PageHeader
        eyebrow="Admin · Pharmacy management"
        title={copy.title}
        description={copy.description}
        actions={(
          <button type="button" onClick={openCreate} className="hms-button hms-button-primary">
            <PackagePlus aria-hidden="true" className="h-4 w-4" />
            Add {copy.singular}
          </button>
        )}
      />

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label={`Total ${section}`} value={source.length} icon={copy.icon} />
        <StatCard label="Active" value={activeCount} icon={Power} tone="success" helper="Available for new operations" />
        <StatCard
          label={section === 'categories' ? 'Assigned medicines' : 'Inactive'}
          value={section === 'categories' ? assignedMedicineCount : source.length - activeCount}
          icon={section === 'categories' ? Pill : Power}
          tone={section === 'categories' ? 'info' : 'danger'}
          helper={section === 'categories' ? 'Calculated from medicine master data' : 'Retained for historical traceability'}
        />
      </section>

      <section className="hms-card overflow-hidden">
        <div className="border-b p-4 sm:p-5">
          <div className={`grid gap-3 ${section === 'medicines' ? 'lg:grid-cols-[1fr_14rem_12rem]' : 'sm:grid-cols-[1fr_12rem]'}`}>
            <label className="relative">
              <span className="sr-only">Search {section}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${section}...`}
                className="hms-input pl-10"
              />
            </label>
            {section === 'medicines' && (
              <label>
                <span className="sr-only">Filter by category</span>
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="hms-input">
                  <option value="">All categories</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>
            )}
            <label>
              <span className="sr-only">Filter by status</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="hms-input">
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </label>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={`No ${section} found`}
            description={source.length === 0 ? `No ${section} have been added yet.` : 'No records match the current search and filters.'}
            action={<button type="button" onClick={openCreate} className="hms-button hms-button-primary">Add {copy.singular}</button>}
          />
        ) : (
          <div className="overflow-x-auto">
            {section === 'suppliers' && <SupplierTable items={filtered as Supplier[]} onEdit={openEdit} onStatus={setStatusTarget} pending={statusPending} />}
            {section === 'categories' && <CategoryTable items={filtered as MedicineCategory[]} medicines={medicines} onEdit={openEdit} onStatus={setStatusTarget} pending={statusPending} />}
            {section === 'medicines' && <MedicineTable items={filtered as Medicine[]} onEdit={openEdit} onStatus={setStatusTarget} pending={statusPending} />}
          </div>
        )}
      </section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`${editing ? 'Edit' : 'Add'} ${copy.singular}`}
        description={editing ? 'Update master data without changing its active status.' : 'New master records are active by default.'}
        size="lg"
      >
        <form action={save} className="grid gap-4 sm:grid-cols-2">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          {error && <p role="alert" className="sm:col-span-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {section === 'suppliers' && <SupplierFields item={editing as Supplier | null} />}
          {section === 'categories' && <CategoryFields item={editing as MedicineCategory | null} />}
          {section === 'medicines' && (
            <MedicineFields
              item={editing as Medicine | null}
              categories={categories}
              medicines={medicines}
              specializations={specializations}
            />
          )}
          <div className="flex justify-end gap-2 border-t pt-4 sm:col-span-2">
            <button type="button" onClick={() => setModalOpen(false)} className="hms-button hms-button-secondary">Cancel</button>
            <SubmitButton>Save {copy.singular}</SubmitButton>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={Boolean(statusTarget)}
        title={`${statusTarget?.status === 'active' ? 'Deactivate' : 'Activate'} ${copy.singular}`}
        description={statusDescription}
        confirmLabel={statusTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        cancelLabel="Cancel"
        danger={statusTarget?.status === 'active'}
        pending={statusPending}
        onConfirm={confirmStatusChange}
        onClose={() => { if (!statusPending) setStatusTarget(null) }}
      />
    </div>
  )
}

function RowActions({ item, pending, onEdit, onStatus }: { item: Editable; pending: boolean; onEdit: (item: Editable) => void; onStatus: (item: Editable) => void }) {
  return (
    <div className="flex justify-end gap-2">
      <button type="button" onClick={() => onEdit(item)} className="hms-button hms-button-secondary min-h-9 px-3 py-2">
        <Pencil aria-hidden="true" className="h-4 w-4" />Edit
      </button>
      <button type="button" disabled={pending} onClick={() => onStatus(item)} className="hms-button hms-button-secondary min-h-9 px-3 py-2">
        <Power aria-hidden="true" className="h-4 w-4" />{item.status === 'active' ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  )
}

function SupplierTable({ items, pending, onEdit, onStatus }: { items: Supplier[]; pending: boolean; onEdit: (item: Editable) => void; onStatus: (item: Editable) => void }) {
  return <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Supplier</th><th className="px-5 py-4">Contact person</th><th className="px-5 py-4">Phone / email</th><th className="px-5 py-4">Address</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">Created {formatDate(item.created_at, false)}</p></td><td className="px-5 py-4">{item.contact_person || '—'}</td><td className="px-5 py-4"><p>{item.phone || 'No phone'}</p><p className="text-xs text-slate-500">{item.email || 'No email'}</p></td><td className="max-w-xs px-5 py-4 text-slate-600">{item.address || '—'}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(item.updated_at || item.created_at)}</td><td className="px-5 py-4"><RowActions item={item} pending={pending} onEdit={onEdit} onStatus={onStatus} /></td></tr>)}</tbody></table>
}

function CategoryTable({ items, medicines, pending, onEdit, onStatus }: { items: MedicineCategory[]; medicines: Medicine[]; pending: boolean; onEdit: (item: Editable) => void; onStatus: (item: Editable) => void }) {
  return <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Category</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Medicines</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id}><td className="px-5 py-4 font-semibold">{item.name}</td><td className="max-w-lg px-5 py-4 text-slate-600">{item.description || '—'}</td><td className="px-5 py-4 font-semibold">{medicines.filter((medicine) => medicine.category_id === item.id).length}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(item.updated_at || item.created_at)}</td><td className="px-5 py-4"><RowActions item={item} pending={pending} onEdit={onEdit} onStatus={onStatus} /></td></tr>)}</tbody></table>
}

function MedicineTable({ items, pending, onEdit, onStatus }: { items: Medicine[]; pending: boolean; onEdit: (item: Editable) => void; onStatus: (item: Editable) => void }) {
  return <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Medicine</th><th className="px-5 py-4">SKU</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Unit</th><th className="px-5 py-4">Minimum stock</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Updated</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody className="divide-y">{items.map((item) => <tr key={item.id}><td className="px-5 py-4"><p className="font-semibold">{item.name}</p><p className="text-xs text-slate-500">{item.generic_name || 'Generic name not specified'}</p></td><td className="px-5 py-4 font-mono text-xs">{item.sku || '—'}</td><td className="px-5 py-4">{item.category_name || '—'}</td><td className="px-5 py-4">{item.unit || '—'}</td><td className="px-5 py-4"><p className="font-semibold">{item.minimum_stock_level}</p><p className="text-xs text-slate-500">Alert threshold, not quantity</p></td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="whitespace-nowrap px-5 py-4 text-slate-500">{formatDate(item.updated_at || item.created_at)}</td><td className="px-5 py-4"><RowActions item={item} pending={pending} onEdit={onEdit} onStatus={onStatus} /></td></tr>)}</tbody></table>
}

function Field({ label, name, defaultValue = '', required = false, type = 'text', ...props }: { label: string; name: string; defaultValue?: string | number; required?: boolean; type?: string; [key: string]: unknown }) {
  return <label><span className="mb-1.5 block text-sm font-semibold">{label}</span><input name={name} type={type} defaultValue={defaultValue} required={required} className="hms-input" {...props} /></label>
}

function SupplierFields({ item }: { item: Supplier | null }) {
  return <><Field label="Supplier name" name="name" defaultValue={item?.name} required minLength={2} maxLength={150} /><Field label="Contact person" name="contact_person" defaultValue={item?.contact_person || ''} maxLength={100} /><Field label="Phone" name="phone" type="tel" defaultValue={item?.phone || ''} pattern="[0-9+() -]{7,20}" /><Field label="Email" name="email" type="email" defaultValue={item?.email || ''} /><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Address</span><textarea name="address" defaultValue={item?.address || ''} maxLength={1000} rows={3} className="hms-input" /></label></>
}

function CategoryFields({ item }: { item: MedicineCategory | null }) {
  return <><Field label="Category name" name="name" defaultValue={item?.name} required minLength={2} maxLength={100} /><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Description</span><textarea name="description" defaultValue={item?.description || ''} maxLength={1000} rows={4} className="hms-input" /></label></>
}

function formatDate(value: string | null | undefined, includeTime = true) {
  if (!value) return '—'
  const date = new Date(value)
  return includeTime ? date.toLocaleString() : date.toLocaleDateString()
}
