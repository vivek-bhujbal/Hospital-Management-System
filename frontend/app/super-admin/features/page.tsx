import { FeatureFlagsPanel, FeatureFlagSummary } from '@/components/SuperAdminManagement'
import { fetchAPI } from '@/lib/api'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function SuperAdminFeatures() {
  const flags = await fetchAPI('/super-admin/features') as FeatureFlagSummary[]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Release controls" title="Feature flags" description="Prepare, document, and safely control platform capabilities from one workspace." />
      <FeatureFlagsPanel flags={flags} />
    </div>
  )
}
