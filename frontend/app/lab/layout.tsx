import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="lab_technician">{children}</DashboardLayout>
}

