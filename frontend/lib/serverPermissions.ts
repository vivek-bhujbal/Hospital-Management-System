import 'server-only'

import { redirect } from 'next/navigation'
import { fetchAPI } from './api'

import {
  hasAnyPermission,
  hasPermission,
  isPermission,
  Permission,
  UserRole,
} from './permissions'


const VALID_ROLES: ReadonlySet<string> = new Set<UserRole>([
  'patient',
  'doctor',
  'receptionist',
  'admin',
  'super_admin',
  'hospital_manager',
  'nurse',
  'pharmacist',
  'lab_technician',
  'radiologist',
  'accountant',
  'insurance_officer',
  'ambulance_staff',
])

interface EffectiveAuthorization {
  role: UserRole
  permissions: unknown[]
}

async function getAuthorization(): Promise<EffectiveAuthorization> {
  const result = await fetchAPI('/rbac/me/permissions') as EffectiveAuthorization
  if (!VALID_ROLES.has(result.role)) redirect('/login')
  return result
}

export async function getCurrentPermissions(): Promise<Permission[]> {
  const authorization = await getAuthorization()
  return Array.isArray(authorization.permissions)
    ? authorization.permissions.filter(isPermission)
    : []
}

export async function getCurrentRole(): Promise<UserRole> {
  return (await getAuthorization()).role
}

export async function requirePermission(
  permission: Permission,
  fallback = '/',
): Promise<void> {
  if (!hasPermission(await getCurrentPermissions(), permission)) {
    redirect(fallback)
  }
}

export async function requireAnyPermission(
  permissions: readonly Permission[],
  fallback = '/',
): Promise<void> {
  if (!hasAnyPermission(await getCurrentPermissions(), permissions)) {
    redirect(fallback)
  }
}
