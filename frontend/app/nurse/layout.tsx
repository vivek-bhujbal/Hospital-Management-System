import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="nurse">{children}</DashboardLayout>
}

