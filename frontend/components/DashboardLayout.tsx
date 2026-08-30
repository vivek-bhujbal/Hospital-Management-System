import React from 'react'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import {
  hasPermission,
  isPermission,
  Permission,
  UserRole,
} from '@/lib/permissions'
import { fetchAPI } from '@/lib/api'
import { ROLE_HOME } from '@/lib/roleRoutes'

interface DashboardLayoutProps {
  children: React.ReactNode
  role: UserRole
  allowedRoles?: readonly UserRole[]
  requiredPermission?: Permission
}

interface CurrentUserAuthorization {
  role: UserRole
  effective_permissions: unknown[]
}

export default async function DashboardLayout({
  children,
  role,
  allowedRoles = [],
  requiredPermission,
}: DashboardLayoutProps) {
  const authorization = await fetchAPI('/auth/me') as CurrentUserAuthorization
  const permissions = authorization.effective_permissions.filter(isPermission)
  const roleAllowed = authorization.role === role || allowedRoles.includes(authorization.role)
  const permissionAllowed = requiredPermission
    ? hasPermission(permissions, requiredPermission)
    : false

  if (!roleAllowed && !permissionAllowed) {
    redirect(ROLE_HOME[authorization.role] || '/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 font-sans">
      <Sidebar
        role={authorization.role}
        portalRole={role}
        permissions={permissions}
      />
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
