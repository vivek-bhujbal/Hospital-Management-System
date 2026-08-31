import { fetchAPI } from '@/lib/api'
import type { NursePatient } from '@/lib/nurseTypes'

import PatientDirectory from './PatientDirectory'

export default async function NursePatients() {
  const patients = await fetchAPI('/nurse/patients') as NursePatient[]
  return <PatientDirectory patients={patients} />
}
