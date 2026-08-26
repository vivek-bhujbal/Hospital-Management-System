import StaffAccountsPanel from '@/components/StaffAccountsPanel'
import type { AccountSummary } from '@/components/AdminAccountsPanel'
import { fetchAPI } from '@/lib/api'

export default async function StaffAccountsPage() {
  const accounts = await fetchAPI('/manager/staff') as AccountSummary[]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Staff accounts</h1>
        <p className="mt-1 text-gray-600">
          Create Hospital Manager and operational-role login accounts with their required profiles.
        </p>
      </div>
      <StaffAccountsPanel accounts={accounts} />
    </div>
  )
}
