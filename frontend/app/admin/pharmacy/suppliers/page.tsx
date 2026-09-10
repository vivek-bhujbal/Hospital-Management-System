import { fetchAPI } from '@/lib/api'
import type { Supplier } from '@/lib/pharmacistTypes'

import PharmacyMasterWorkspace from '../PharmacyMasterWorkspace'

export default async function AdminPharmacySuppliersPage() {
  const suppliers = await fetchAPI('/admin/pharmacy/suppliers') as Supplier[]
  return <PharmacyMasterWorkspace section="suppliers" suppliers={suppliers} />
}
