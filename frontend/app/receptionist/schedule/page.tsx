import { fetchAPI } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { requirePermission } from '@/lib/serverPermissions'
import ScheduleForm from './ScheduleForm'

export default async function ReceptionistSchedule() {
  await requirePermission(PERMISSIONS.APPOINTMENTS_CREATE, '/receptionist/home')
  const patients = await fetchAPI('/patients/')
  const doctors = await fetchAPI('/doctors/')

  return <ScheduleForm patients={patients} doctors={doctors} />
}
