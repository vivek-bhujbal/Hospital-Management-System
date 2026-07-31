import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'

export default function ReceptionistLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout role="receptionist">{children}</DashboardLayout>
}
