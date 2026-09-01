import { OrganizationsPanel, OrganizationSummary } from '@/components/SuperAdminManagement'
import { fetchAPI } from '@/lib/api'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function SuperAdminHospitals() {
  const organizations = await fetchAPI('/super-admin/hospitals') as OrganizationSummary[]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Organization management" title="Hospital organizations" description="Create hospital workspaces, maintain contact details, and control platform access." />
      <OrganizationsPanel organizations={organizations} />
    </div>
  )
}
