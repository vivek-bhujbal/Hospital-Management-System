import { fetchAPI } from '@/lib/api'
import { ManagerPatient } from '@/lib/managerTypes'

import PatientMonitor from './PatientMonitor'

export default async function ManagerPatients() {
  const patients = await fetchAPI('/manager/patients') as ManagerPatient[]
  return <PatientMonitor patients={patients} />
}
