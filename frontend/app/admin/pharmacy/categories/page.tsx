import { fetchAPI } from '@/lib/api'
import type { Medicine, MedicineCategory } from '@/lib/pharmacistTypes'

import PharmacyMasterWorkspace from '../PharmacyMasterWorkspace'

export default async function AdminPharmacyCategoriesPage() {
  const [categories, medicines] = await Promise.all([
    fetchAPI('/admin/pharmacy/categories') as Promise<MedicineCategory[]>,
    fetchAPI('/admin/pharmacy/medicines') as Promise<Medicine[]>,
  ])
  return <PharmacyMasterWorkspace section="categories" categories={categories} medicines={medicines} />
}
