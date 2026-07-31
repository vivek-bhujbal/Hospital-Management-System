import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="doctor">{children}</DashboardLayout>
}
