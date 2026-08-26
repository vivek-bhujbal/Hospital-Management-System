import { SystemSettingsPanel, SystemSettingSummary } from '@/components/SuperAdminManagement'
import { fetchAPI } from '@/lib/api'

export default async function SuperAdminSettings() {
  const settings = await fetchAPI('/super-admin/settings') as SystemSettingSummary[]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System settings</h1>
        <p className="mt-1 text-gray-600">Create and update platform-wide configuration values.</p>
      </div>
      <SystemSettingsPanel settings={settings} />
    </div>
  )
}
