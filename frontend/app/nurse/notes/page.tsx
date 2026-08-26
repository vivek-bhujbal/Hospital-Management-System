import EnterpriseResourcePage from '@/components/EnterpriseResourcePage'

export default function NurseNotes() {
  return <EnterpriseResourcePage title="Assigned patients for nursing notes" endpoint="/nurse/patients" />
}
