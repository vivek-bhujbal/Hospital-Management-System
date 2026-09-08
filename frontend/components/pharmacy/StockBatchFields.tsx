'use client'

import type { Medicine, Supplier } from '@/lib/pharmacistTypes'

export default function StockBatchFields({ medicines, suppliers, onMedicineChange }: { medicines: Medicine[]; suppliers: Supplier[]; onMedicineChange?: (id: string) => void }) {
  return <>
    <label><span className="mb-1.5 block text-sm font-semibold">Medicine</span><select name="medicine_id" required className="hms-input" onChange={event => onMedicineChange?.(event.target.value)}><option value="">Select medicine</option>{medicines.map(item => <option key={item.id} value={item.id}>{item.name} {item.sku ? `(${item.sku})` : ''}</option>)}</select></label>
    <label><span className="mb-1.5 block text-sm font-semibold">Supplier</span><select name="supplier_id" required className="hms-input"><option value="">Select active supplier</option>{suppliers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label><span className="mb-1.5 block text-sm font-semibold">Batch number</span><input name="batch_number" required maxLength={100} className="hms-input" /></label>
    <label><span className="mb-1.5 block text-sm font-semibold">Expiry date</span><input name="expiry_date" type="date" required className="hms-input" /></label>
    <label><span className="mb-1.5 block text-sm font-semibold">New stock quantity to add</span><input name="quantity" type="number" min="1" required className="hms-input" /><span className="mt-1 block text-xs text-slate-500">Additional physical stock only. Do not re-enter stock already recorded.</span></label>
    <label><span className="mb-1.5 block text-sm font-semibold">Purchase price</span><input name="purchase_price" type="number" min="0" step="0.01" required className="hms-input" /></label>
    <label><span className="mb-1.5 block text-sm font-semibold">Selling price</span><input name="selling_price" type="number" min="0" step="0.01" required className="hms-input" /></label>
  </>
}
