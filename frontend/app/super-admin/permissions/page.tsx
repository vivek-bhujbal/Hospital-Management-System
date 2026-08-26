import EnterpriseResourcePage from '@/components/EnterpriseResourcePage'

export default function SuperAdminPermissions() {
  return <EnterpriseResourcePage title="Dynamic role grants" endpoint="/super-admin/roles-permissions" />
}
