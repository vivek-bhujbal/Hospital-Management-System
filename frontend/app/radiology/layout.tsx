import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { PERMISSIONS } from '@/lib/permissions'

export default function RadiologyLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="radiologist" requiredPermission={PERMISSIONS.RADIOLOGY_VIEW}>{children}</DashboardLayout>
}

