import EnterpriseResourcePage from '@/components/EnterpriseResourcePage'

export default function PharmacyPrescriptions() {
  return <EnterpriseResourcePage title="Prescriptions awaiting dispensing" endpoint="/pharmacy/prescriptions" />
}
