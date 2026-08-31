import { fetchAPI } from '@/lib/api'
import type { DispensingRecord, InventoryBatch, PharmacyPrescription } from '@/lib/pharmacistTypes'
import DispensingWorkspace from './DispensingWorkspace'

export default async function DispensingPage({ searchParams }: { searchParams?: { prescription?: string } }) {
  const [prescriptions, inventory, records] = await Promise.all([
    fetchAPI('/pharmacy/prescriptions?status=ready_for_dispensing') as Promise<PharmacyPrescription[]>,
    fetchAPI('/pharmacy/inventory') as Promise<InventoryBatch[]>,
    fetchAPI('/pharmacy/dispensings') as Promise<DispensingRecord[]>,
  ])
  return <DispensingWorkspace prescriptions={prescriptions} inventory={inventory} records={records} initialPrescription={searchParams?.prescription || ''}/>
}
