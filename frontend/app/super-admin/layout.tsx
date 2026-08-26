import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="super_admin">{children}</DashboardLayout>
}
