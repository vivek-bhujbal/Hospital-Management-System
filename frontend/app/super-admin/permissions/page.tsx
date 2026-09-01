import { RoleGrantsPanel, RoleGrantSummary } from '@/components/SuperAdminManagement'
import { fetchAPI } from '@/lib/api'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function SuperAdminPermissions() {
  const grants = await fetchAPI('/super-admin/roles-permissions') as RoleGrantSummary[]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Access governance" title="Role grants" description="Add or remove dynamic permissions while preserving the platform's built-in role boundaries." />
      <RoleGrantsPanel grants={grants} />
    </div>
  )
}
