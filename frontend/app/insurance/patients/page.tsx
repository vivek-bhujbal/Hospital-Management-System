import { fetchAPI } from '@/lib/api'
import type { InsurancePatient, InsuranceProvider } from '@/lib/insuranceTypes'
import InsurancePatientWorkspace from './InsurancePatientWorkspace'

export default async function InsurancePatientsPage() {
  const [patients, providers] = await Promise.all([
    fetchAPI('/insurance/patients') as Promise<InsurancePatient[]>,
    fetchAPI('/insurance/providers') as Promise<InsuranceProvider[]>,
  ])
  return <InsurancePatientWorkspace patients={patients} providers={providers}/>
}
