import EnterpriseResourcePage from '@/components/EnterpriseResourcePage'

export default function PatientDetail({ params }: { params: { id: string } }) {
  return (
    <EnterpriseResourcePage
      title="Patient vital history"
      endpoint={`/nurse/vitals/patient/${encodeURIComponent(params.id)}`}
    />
  )
}
