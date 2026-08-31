import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="hospital_manager">{children}</DashboardLayout>
}

