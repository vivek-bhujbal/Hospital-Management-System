import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { PERMISSIONS } from '@/lib/permissions'

export default function AmbulanceLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="ambulance_staff" requiredPermission={PERMISSIONS.AMBULANCE_VIEW}>{children}</DashboardLayout>
}

