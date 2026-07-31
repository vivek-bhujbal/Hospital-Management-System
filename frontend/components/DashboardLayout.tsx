import React from 'react'
import { cookies } from 'next/headers'
import Sidebar from './Sidebar'

type Role = 'patient' | 'receptionist' | 'doctor' | 'admin'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: Role
}

export default function DashboardLayout({ children, role }: DashboardLayoutProps) {
  let permissions: any = {}
  if (role === 'receptionist') {
    const permStr = cookies().get('employee_permissions')?.value
    if (permStr) {
      try {
        permissions = JSON.parse(permStr)
      } catch (e) {}
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      <Sidebar role={role} permissions={permissions} />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
