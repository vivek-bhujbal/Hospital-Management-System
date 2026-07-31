import React from 'react'
import Sidebar from './Sidebar'

type Role = 'patient' | 'receptionist' | 'doctor' | 'admin'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: Role
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      <Sidebar role={role} />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
