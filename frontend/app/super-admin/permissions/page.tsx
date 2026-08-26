import { RoleGrantsPanel, RoleGrantSummary } from '@/components/SuperAdminManagement'
import { fetchAPI } from '@/lib/api'

export default async function SuperAdminPermissions() {
  const grants = await fetchAPI('/super-admin/roles-permissions') as RoleGrantSummary[]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Role grants</h1>
        <p className="mt-1 text-gray-600">Add or remove dynamic permissions for hospital roles.</p>
      </div>
      <RoleGrantsPanel grants={grants} />
    </div>
  )
}
