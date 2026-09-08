import { fetchAPI } from '@/lib/api'
import type { Medicine, MedicineCategory, Supplier } from '@/lib/pharmacistTypes'
import PharmacyMasterWorkspace from './PharmacyMasterWorkspace'

export default async function AdminPharmacyPage() {
  const [suppliers, categories, medicines, specializations] = await Promise.all([
    fetchAPI('/admin/pharmacy/suppliers') as Promise<Supplier[]>,
    fetchAPI('/admin/pharmacy/categories') as Promise<MedicineCategory[]>,
    fetchAPI('/admin/pharmacy/medicines') as Promise<Medicine[]>,
    fetchAPI('/admin/pharmacy/specializations') as Promise<string[]>,
  ])
  return <PharmacyMasterWorkspace suppliers={suppliers} categories={categories} medicines={medicines} specializations={specializations} />
}
