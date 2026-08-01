import { fetchAPI } from '@/lib/api'
import { requirePermission } from '@/lib/permissions'
import ScheduleForm from './ScheduleForm'

export default async function ReceptionistSchedule() {
  requirePermission('can_schedule_appointment')
  const patients = await fetchAPI('/patients/')
  const doctors = await fetchAPI('/doctors/')

  return <ScheduleForm patients={patients} doctors={doctors} />
}
