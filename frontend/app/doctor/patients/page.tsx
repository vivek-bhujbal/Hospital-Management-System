import { fetchAPI } from '@/lib/api'
import { DoctorAppointment, DoctorPatient } from '@/lib/doctorTypes'

import PatientDirectory from './PatientDirectory'

export default async function DoctorPatients() {
  const [patients, appointments] = await Promise.all([
    fetchAPI('/patients/') as Promise<DoctorPatient[]>,
    fetchAPI('/appointments/?doctor_id=me') as Promise<DoctorAppointment[]>,
  ])

  return <PatientDirectory patients={patients} appointments={appointments} />
}
