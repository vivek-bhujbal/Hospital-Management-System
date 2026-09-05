import { fetchAPI } from '@/lib/api'
import type { NurseAppointment, NursePatient, NurseVital } from '@/lib/nurseTypes'

import VitalsWorkspace from './VitalsWorkspace'

export default async function NurseVitals({ searchParams }: { searchParams: { patient_id?: string } }) {
  const [patients, appointments, vitals] = await Promise.all([
    fetchAPI('/nurse/patients') as Promise<NursePatient[]>,
    fetchAPI('/nurse/appointments') as Promise<NurseAppointment[]>,
    fetchAPI('/nurse/vitals') as Promise<NurseVital[]>,
  ])
  return <VitalsWorkspace patients={patients} appointments={appointments} vitals={vitals} initialPatientId={searchParams.patient_id} />
}
