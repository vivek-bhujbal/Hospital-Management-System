import { FeatureFlagsPanel, FeatureFlagSummary } from '@/components/SuperAdminManagement'
import { fetchAPI } from '@/lib/api'

export default async function SuperAdminFeatures() {
  const flags = await fetchAPI('/super-admin/features') as FeatureFlagSummary[]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Feature flags</h1>
        <p className="mt-1 text-gray-600">Create platform features and safely enable or disable them.</p>
      </div>
      <FeatureFlagsPanel flags={flags} />
    </div>
  )
}
