import { fetchAPI } from '@/lib/api'
import type { InventoryBatch, Medicine, MedicineCategory, Supplier } from '@/lib/pharmacistTypes'
import InventoryWorkspace from './InventoryWorkspace'

export default async function InventoryPage() {
  const [inventory, medicines, categories, suppliers] = await Promise.all([
    fetchAPI('/pharmacy/inventory?include_empty=true') as Promise<InventoryBatch[]>,
    fetchAPI('/pharmacy/medicines') as Promise<Medicine[]>,
    fetchAPI('/pharmacy/categories') as Promise<MedicineCategory[]>,
    fetchAPI('/pharmacy/suppliers') as Promise<Supplier[]>,
  ])
  return <InventoryWorkspace inventory={inventory} medicines={medicines} categories={categories} suppliers={suppliers}/>
}
