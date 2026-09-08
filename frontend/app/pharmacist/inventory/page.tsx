import { fetchAPI } from '@/lib/api'
import type { InventoryBatch, InventorySummary, Medicine, MedicineCategory, Supplier } from '@/lib/pharmacistTypes'
import InventoryWorkspace from './InventoryWorkspace'

export default async function InventoryPage() {
  const [inventory, summary, medicines, categories, suppliers] = await Promise.all([
    fetchAPI('/pharmacy/inventory?include_empty=true') as Promise<InventoryBatch[]>,
    fetchAPI('/pharmacy/inventory/summary') as Promise<InventorySummary>,
    fetchAPI('/pharmacy/medicines?active_only=true') as Promise<Medicine[]>,
    fetchAPI('/pharmacy/categories') as Promise<MedicineCategory[]>,
    fetchAPI('/pharmacy/suppliers?active_only=true') as Promise<Supplier[]>,
  ])
  return <InventoryWorkspace inventory={inventory} summary={summary} medicines={medicines} categories={categories} suppliers={suppliers}/>
}
