import { fetchAPI } from '@/lib/api'
import type { PharmacyPrescription } from '@/lib/pharmacistTypes'
import PrescriptionDirectory from './PrescriptionDirectory'

export default async function PharmacistPrescriptions() {
  const prescriptions = await fetchAPI('/pharmacy/prescriptions') as PharmacyPrescription[]
  return <PrescriptionDirectory prescriptions={prescriptions} />
}
