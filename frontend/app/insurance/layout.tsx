import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { PERMISSIONS } from '@/lib/permissions'

export default function InsuranceLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="insurance_officer" requiredPermission={PERMISSIONS.INSURANCE_VIEW}>{children}</DashboardLayout>
}

