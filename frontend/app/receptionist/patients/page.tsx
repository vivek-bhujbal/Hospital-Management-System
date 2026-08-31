import { fetchAPI } from '@/lib/api'
import { ReceptionAppointment, ReceptionDoctor, ReceptionPatient } from '@/lib/receptionistTypes'
import PatientDirectory from './PatientDirectory'

export default async function ReceptionistPatientsPage() {
  const [patients, appointments, doctors] = await Promise.all([
    fetchAPI('/patients/') as Promise<ReceptionPatient[]>,
    fetchAPI('/appointments/') as Promise<ReceptionAppointment[]>,
    fetchAPI('/doctors/') as Promise<ReceptionDoctor[]>,
  ])

  return <PatientDirectory patients={patients} appointments={appointments} doctors={doctors} />
}
