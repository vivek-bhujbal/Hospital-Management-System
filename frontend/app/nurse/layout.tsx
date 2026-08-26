import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { PERMISSIONS } from '@/lib/permissions'

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="nurse" requiredPermission={PERMISSIONS.NURSING_VIEW}>{children}</DashboardLayout>
}

