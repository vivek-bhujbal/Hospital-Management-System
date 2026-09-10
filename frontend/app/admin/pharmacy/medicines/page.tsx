import { fetchAPI } from '@/lib/api'
import type { Medicine, MedicineCategory } from '@/lib/pharmacistTypes'

import PharmacyMasterWorkspace from '../PharmacyMasterWorkspace'

export default async function AdminPharmacyMedicinesPage() {
  const [categories, medicines, specializations] = await Promise.all([
    fetchAPI('/admin/pharmacy/categories') as Promise<MedicineCategory[]>,
    fetchAPI('/admin/pharmacy/medicines') as Promise<Medicine[]>,
    fetchAPI('/admin/pharmacy/specializations') as Promise<string[]>,
  ])
  return <PharmacyMasterWorkspace section="medicines" categories={categories} medicines={medicines} specializations={specializations} />
}
