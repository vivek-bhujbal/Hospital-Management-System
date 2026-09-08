'use client'

import { useState } from 'react'
import type { Medicine, MedicineCategory } from '@/lib/pharmacistTypes'
import { DOCTOR_SPECIALIZATIONS } from '@/lib/doctorSpecializations'
import { CATALOG_CATEGORIES, MEDICINE_UNITS, PHARMACY_CATALOG, catalogForSpecialty } from '@/lib/pharmacyCatalog'

function Dropdown({ label, name, value, options, onChange, required = false }: { label: string; name?: string; value: string; options: string[]; onChange: (value: string) => void; required?: boolean }) {
  const [custom, setCustom] = useState(false)
  return <label><span className="mb-1.5 block text-sm font-semibold">{label}</span>
    <select className="hms-input" value={custom ? '__custom' : value} onChange={event => { const next = event.target.value; setCustom(next === '__custom'); if (next !== '__custom') onChange(next) }} required={required}>
      <option value="">Select {label.toLowerCase()}</option>
      {Array.from(new Set([...options, value].filter(Boolean))).sort().map(option => <option key={option}>{option}</option>)}
      <option value="__custom">Enter custom value...</option>
    </select>
    {custom && <input aria-label={`Custom ${label.toLowerCase()}`} value={value} onChange={event => onChange(event.target.value)} maxLength={name === 'unit' ? 50 : 150} required={required} className="hms-input mt-2" />}
    {name && <input type="hidden" name={name} value={value} />}
  </label>
}

export default function MedicineFields({ item, categories, medicines, specializations }: { item: Medicine | null; categories: MedicineCategory[]; medicines: Medicine[]; specializations: string[] }) {
  const [specialty, setSpecialty] = useState(item?.specializations?.[0] || '')
  const [search, setSearch] = useState('')
  const [selection, setSelection] = useState('')
  const [name, setName] = useState(item?.name || '')
  const [generic, setGeneric] = useState(item?.generic_name || '')
  const [unit, setUnit] = useState(item?.unit || '')
  const [category, setCategory] = useState(item ? `id:${item.category_id}` : '')
  const [customCategory, setCustomCategory] = useState('')
  const specialties = Array.from(new Set([...DOCTOR_SPECIALIZATIONS, ...specializations, ...medicines.flatMap(medicine => medicine.specializations || []), ...(item?.specializations || [])])).sort()
  const references = catalogForSpecialty(specialty).filter(medicine => `${medicine.name} ${medicine.category}`.toLowerCase().includes(search.toLowerCase()))
  const existing = medicines.filter(medicine => medicine.status === 'active' && (!specialty || medicine.specializations?.includes(specialty)) && `${medicine.name} ${medicine.generic_name}`.toLowerCase().includes(search.toLowerCase()))
  const activeCategories = categories.filter(record => record.status === 'active' || record.id === item?.category_id)
  const suggestions = CATALOG_CATEGORIES.filter(label => !categories.some(record => record.name.toLowerCase() === label.toLowerCase()))

  function choose(value: string) {
    setSelection(value)
    if (!value || value === 'custom') return
    if (value.startsWith('id:')) {
      const medicine = medicines.find(record => record.id === Number(value.slice(3)))
      if (!medicine) return
      setName(medicine.name); setGeneric(medicine.generic_name || ''); setUnit(medicine.unit || ''); setCategory(`id:${medicine.category_id}`)
    } else {
      const medicine = PHARMACY_CATALOG.find(record => record.name === value)
      if (!medicine) return
      const match = categories.find(record => record.name.toLowerCase() === medicine.category.toLowerCase())
      setName(medicine.name); setGeneric(medicine.generic_name); setUnit(medicine.unit); setCategory(match ? `id:${match.id}` : `new:${medicine.category}`)
    }
  }

  return <>
    <div className="rounded-xl border border-teal-100 bg-teal-50 p-3 text-sm text-teal-900 sm:col-span-2">
      Browse reference medicines by specialty. These are catalog suggestions, not prescribing permissions or an exhaustive formulary. Confirm the exact product, strength, form and stock unit before saving. New categories are created only when you save.
      <a href="https://www.nhs.uk/medicines/" target="_blank" rel="noreferrer" className="ml-1 underline">Medicine reference</a>
    </div>
    <label><span className="mb-1.5 block text-sm font-semibold">Doctor specialization</span><select value={specialty} onChange={event => { setSpecialty(event.target.value); setSelection(''); setSearch('') }} className="hms-input"><option value="">All specializations / not specified</option>{specialties.map(value => <option key={value}>{value}</option>)}</select></label>
    {(specialty === item?.specializations?.[0] ? item.specializations : specialty ? [specialty] : []).map(value => <input key={value} type="hidden" name="specializations" value={value} />)}
    <label><span className="mb-1.5 block text-sm font-semibold">Search medicine catalog</span><input value={search} onChange={event => setSearch(event.target.value)} className="hms-input" placeholder="Medicine, generic name or category" /></label>
    <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Medicine dropdown</span><select value={selection} onChange={event => choose(event.target.value)} className="hms-input"><option value="">Select a medicine to fill its details</option><option value="custom">Enter a custom medicine</option><optgroup label="Existing hospital medicines">{existing.map(medicine => <option key={medicine.id} value={`id:${medicine.id}`}>{medicine.name} (already registered)</option>)}</optgroup><optgroup label={`Reference catalog (${references.length})`}>{references.map(medicine => <option key={medicine.name} value={medicine.name}>{medicine.name} — {medicine.category}</option>)}</optgroup></select></label>
    {references.length === 0 && <p className="text-sm text-amber-700 sm:col-span-2">No reference matches this specialty/search. Select All specializations, use an existing medicine, or add a hospital-approved custom entry.</p>}
    <label><span className="mb-1.5 block text-sm font-semibold">Medicine name / product strength</span><input name="name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={150} className="hms-input" placeholder="Confirm exact product, e.g. strength and form" /></label>
    <Dropdown label="Generic name" name="generic_name" value={generic} options={[...PHARMACY_CATALOG.map(record => record.generic_name), ...medicines.map(record => record.generic_name || '')]} onChange={setGeneric} required />
    <label><span className="mb-1.5 block text-sm font-semibold">SKU / medicine code</span><input name="sku" defaultValue={item?.sku || ''} maxLength={100} className="hms-input" /></label>
    <label><span className="mb-1.5 block text-sm font-semibold">Category</span><select value={category} onChange={event => setCategory(event.target.value)} required className="hms-input"><option value="">Select category</option>{activeCategories.map(record => <option key={record.id} value={`id:${record.id}`}>{record.name}{record.status === 'inactive' ? ' (inactive)' : ''}</option>)}<optgroup label="Suggested categories — create on save">{suggestions.map(value => <option key={value} value={`new:${value}`}>{value}</option>)}</optgroup><option value="custom">Enter custom category...</option></select>{category === 'custom' && <input aria-label="Custom category" value={customCategory} onChange={event => setCustomCategory(event.target.value)} required minLength={2} maxLength={100} className="hms-input mt-2" />}</label>
    <input type="hidden" name="category_id" value={category.startsWith('id:') ? category.slice(3) : ''} />
    <input type="hidden" name="category_name" value={category === 'custom' ? customCategory : category.startsWith('new:') ? category.slice(4) : ''} />
    <Dropdown label="Unit" name="unit" value={unit} options={[...MEDICINE_UNITS, ...medicines.map(record => record.unit || '')]} onChange={setUnit} required />
    <label><span className="mb-1.5 block text-sm font-semibold">Low-stock alert threshold (not quantity)</span><input name="minimum_stock_level" type="number" defaultValue={item?.minimum_stock_level ?? 10} required min={0} max={1000000} className="hms-input" /><span className="mt-1 block text-xs text-slate-500">To record actual quantity, save the medicine then use Add actual stock.</span></label>
    <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold">Description</span><textarea name="description" defaultValue={item?.description || ''} maxLength={1000} rows={3} className="hms-input" /></label>
    <label><span className="mb-1.5 block text-sm font-semibold">Status</span><select name="status" defaultValue={item?.status || 'active'} className="hms-input"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
  </>
}
