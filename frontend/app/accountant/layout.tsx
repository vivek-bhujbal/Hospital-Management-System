import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { PERMISSIONS } from '@/lib/permissions'

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="accountant" requiredPermission={PERMISSIONS.ACCOUNTING_VIEW}>{children}</DashboardLayout>
}

