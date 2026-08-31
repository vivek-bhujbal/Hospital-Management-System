import { fetchAPI } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { ReceptionAppointment, ReceptionDoctor, ReceptionPatient } from '@/lib/receptionistTypes'
import { requirePermission } from '@/lib/serverPermissions'
import ScheduleForm from './ScheduleForm'

export default async function ReceptionistSchedule({
  searchParams,
}: {
  searchParams: { patient_id?: string }
}) {
  await requirePermission(PERMISSIONS.APPOINTMENTS_CREATE, '/receptionist/home')
  const [patients, doctors, appointments] = await Promise.all([
    fetchAPI('/patients/') as Promise<ReceptionPatient[]>,
    fetchAPI('/doctors/') as Promise<ReceptionDoctor[]>,
    fetchAPI('/appointments/') as Promise<ReceptionAppointment[]>,
  ])
  const requestedPatientId = Number(searchParams.patient_id)
  const initialPatientId = patients.some((patient) => patient.id === requestedPatientId)
    ? requestedPatientId
    : null

  return <ScheduleForm patients={patients} doctors={doctors} appointments={appointments} initialPatientId={initialPatientId} />
}
