import { OrganizationsPanel, OrganizationSummary } from '@/components/SuperAdminManagement'
import { fetchAPI } from '@/lib/api'

export default async function SuperAdminHospitals() {
  const organizations = await fetchAPI('/super-admin/hospitals') as OrganizationSummary[]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
        <p className="mt-1 text-gray-600">Create hospital organizations and control whether they are active.</p>
      </div>
      <OrganizationsPanel organizations={organizations} />
    </div>
  )
}
