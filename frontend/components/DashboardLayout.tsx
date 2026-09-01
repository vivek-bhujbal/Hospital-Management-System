import React from 'react'
import { redirect } from 'next/navigation'
import AppShell, { ShellNotification } from './layout/AppShell'
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
  name: string
  email: string
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

  const notifications = await fetchAPI('/notifications/me').catch(() => []) as ShellNotification[]

  return <AppShell role={authorization.role} portalRole={role} permissions={permissions} user={{ name: authorization.name, email: authorization.email }} notifications={notifications}>{children}</AppShell>
}
