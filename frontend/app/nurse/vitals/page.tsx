import EnterpriseResourcePage from '@/components/EnterpriseResourcePage'

export default function NurseVitals() {
  return <EnterpriseResourcePage title="Assigned patients for vital recording" endpoint="/nurse/patients" />
}
