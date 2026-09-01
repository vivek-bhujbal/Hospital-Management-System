import StaffAccountsPanel from '@/components/StaffAccountsPanel'
import type { AccountSummary } from '@/components/AdminAccountsPanel'
import { fetchAPI } from '@/lib/api'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function StaffAccountsPage() {
  const accounts = await fetchAPI('/admin/staff') as AccountSummary[]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Workforce access" title="Staff accounts" description="Create and manage Hospital Manager, clinical, and operational-role login accounts." />
      <StaffAccountsPanel accounts={accounts} />
    </div>
  )
}
