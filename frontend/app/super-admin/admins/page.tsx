import Link from 'next/link'

import AdminAccountsPanel, { AccountSummary } from '@/components/AdminAccountsPanel'
import { fetchAPI } from '@/lib/api'

export default async function SuperAdminAdmins() {
  const accounts = await fetchAPI('/super-admin/admins') as AccountSummary[]
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Administrators</h1>
        <p className="mt-1 text-gray-600">Create and review hospital Admin accounts.</p>
        <p className="mt-2 text-sm text-blue-700">
          This page excludes the environment-owned Super Admin.{' '}
          <Link href="/super-admin/users" className="font-semibold underline underline-offset-2">
            View all system users
          </Link>
        </p>
      </div>
      <AdminAccountsPanel accounts={accounts} />
    </div>
  )
}
