import { fetchAPI } from '@/lib/api'
import { ManagerAppointment, ManagerDepartment, ManagerDoctor } from '@/lib/managerTypes'

import AppointmentMonitor from './AppointmentMonitor'

export default async function ManagerAppointments() {
  const [appointments, doctors, departments] = await Promise.all([
    fetchAPI('/manager/appointments') as Promise<ManagerAppointment[]>,
    fetchAPI('/manager/doctors') as Promise<ManagerDoctor[]>,
    fetchAPI('/manager/departments') as Promise<ManagerDepartment[]>,
  ])
  return <AppointmentMonitor appointments={appointments} doctors={doctors} departments={departments} />
}
