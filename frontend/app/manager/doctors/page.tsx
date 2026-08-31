import { fetchAPI } from '@/lib/api'
import { ManagerDoctor } from '@/lib/managerTypes'

import DoctorMonitor from './DoctorMonitor'

export default async function ManagerDoctors() {
  const doctors = await fetchAPI('/manager/doctors') as ManagerDoctor[]
  return <DoctorMonitor doctors={doctors} />
}
