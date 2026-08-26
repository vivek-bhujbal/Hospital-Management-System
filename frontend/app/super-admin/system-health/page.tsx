import EnterpriseResourcePage from '@/components/EnterpriseResourcePage'

export default function SuperAdminHealth() {
  return <EnterpriseResourcePage title="System health" endpoint="/super-admin/system-health" />
}
