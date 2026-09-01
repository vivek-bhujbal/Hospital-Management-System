import { SystemSettingsPanel, SystemSettingSummary } from '@/components/SuperAdminManagement'
import { fetchAPI } from '@/lib/api'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function SuperAdminSettings() {
  const settings = await fetchAPI('/super-admin/settings') as SystemSettingSummary[]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="System configuration" title="Platform settings" description="Create and maintain configuration values shared across the hospital platform." />
      <SystemSettingsPanel settings={settings} />
    </div>
  )
}
