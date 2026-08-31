import { fetchAPI } from '@/lib/api'
import type { NurseAppointment } from '@/lib/nurseTypes'

import AppointmentMonitor from './AppointmentMonitor'

export default async function NurseAppointments() {
  const appointments = await fetchAPI('/nurse/appointments') as NurseAppointment[]
  return <AppointmentMonitor appointments={appointments} />
}
