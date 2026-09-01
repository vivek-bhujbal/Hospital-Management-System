import Link from 'next/link'
import { UsersRound } from 'lucide-react'

import AdminAccountsPanel, { AccountSummary } from '@/components/AdminAccountsPanel'
import { fetchAPI } from '@/lib/api'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function SuperAdminAdmins() {
  const accounts = await fetchAPI('/super-admin/admins') as AccountSummary[]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administrator management" title="Administrators" description="Create, review, and securely manage hospital administrator accounts." actions={<Link href="/super-admin/users" className="hms-button hms-button-secondary"><UsersRound className="h-4 w-4" />All system users</Link>} />
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-200">This directory intentionally excludes the environment-owned Super Admin account.</div>
      <AdminAccountsPanel accounts={accounts} />
    </div>
  )
}
