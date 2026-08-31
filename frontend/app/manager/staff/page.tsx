import { fetchAPI } from '@/lib/api'
import { ManagerStaff } from '@/lib/managerTypes'

import StaffMonitor from './StaffMonitor'

export default async function ManagerStaffPage() {
  const staff = await fetchAPI('/manager/staff') as ManagerStaff[]
  return <StaffMonitor staff={staff} />
}
