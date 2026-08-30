'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8000'

export interface SuperAdminActionResult {
  error?: string
  success?: boolean
}

function authHeaders(): Record<string, string> {
  const token = cookies().get('token')?.value
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

async function errorDetail(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null
  if (typeof payload?.detail === 'string') return payload.detail
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((entry) => {
      if (typeof entry === 'object' && entry !== null && 'msg' in entry) {
        return String((entry as { msg: unknown }).msg)
      }
      return String(entry)
    }).join(', ')
  }
  return fallback
}

async function apiAction(
  endpoint: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body: Record<string, unknown> | undefined,
  fallback: string,
): Promise<SuperAdminActionResult> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.status === 401) redirect('/login')
  if (!response.ok) return { error: await errorDetail(response, fallback) }
  return { success: true }
}

function value(formData: FormData, key: string): string {
  const item = formData.get(key)
  return typeof item === 'string' ? item.trim() : ''
}

function optionalValue(formData: FormData, key: string): string | null {
  return value(formData, key) || null
}

export async function createOrganizationAction(formData: FormData): Promise<SuperAdminActionResult> {
  const result = await apiAction('/super-admin/hospitals', 'POST', {
    name: value(formData, 'name'),
    address: optionalValue(formData, 'address'),
    contact_email: optionalValue(formData, 'contact_email'),
    contact_phone: optionalValue(formData, 'contact_phone'),
    is_active: true,
  }, 'Failed to create organization')
  if (result.success) {
    revalidatePath('/super-admin/home')
    revalidatePath('/super-admin/hospitals')
  }
  return result
}

export async function setOrganizationActiveAction(formData: FormData): Promise<SuperAdminActionResult> {
  const id = value(formData, 'id')
  const isActive = value(formData, 'is_active') === 'true'
  const result = await apiAction(`/super-admin/hospitals/${id}`, 'PUT', {
    is_active: isActive,
  }, 'Failed to update organization')
  if (result.success) {
    revalidatePath('/super-admin/home')
    revalidatePath('/super-admin/hospitals')
  }
  return result
}

export async function updateOrganizationAction(formData: FormData): Promise<SuperAdminActionResult> {
  const id = value(formData, 'id')
  const result = await apiAction(`/super-admin/hospitals/${id}`, 'PUT', {
    name: value(formData, 'name'),
    address: optionalValue(formData, 'address'),
    contact_email: optionalValue(formData, 'contact_email'),
    contact_phone: optionalValue(formData, 'contact_phone'),
  }, 'Failed to update organization')
  if (result.success) {
    revalidatePath('/super-admin/home')
    revalidatePath('/super-admin/hospitals')
  }
  return result
}

export async function createSystemSettingAction(formData: FormData): Promise<SuperAdminActionResult> {
  const result = await apiAction('/super-admin/settings', 'POST', {
    setting_key: value(formData, 'setting_key'),
    setting_value: optionalValue(formData, 'setting_value'),
    description: optionalValue(formData, 'description'),
  }, 'Failed to create system setting')
  if (result.success) revalidatePath('/super-admin/settings')
  return result
}

export async function updateSystemSettingAction(formData: FormData): Promise<SuperAdminActionResult> {
  const id = value(formData, 'id')
  const result = await apiAction(`/super-admin/settings/${id}`, 'PUT', {
    setting_value: optionalValue(formData, 'setting_value'),
    description: optionalValue(formData, 'description'),
  }, 'Failed to update system setting')
  if (result.success) revalidatePath('/super-admin/settings')
  return result
}

export async function createRoleGrantAction(formData: FormData): Promise<SuperAdminActionResult> {
  const result = await apiAction('/super-admin/roles-permissions', 'POST', {
    role: value(formData, 'role'),
    permission: value(formData, 'permission'),
    description: optionalValue(formData, 'description'),
  }, 'Failed to create role grant')
  if (result.success) revalidatePath('/super-admin/permissions')
  return result
}

export async function deleteRoleGrantAction(formData: FormData): Promise<SuperAdminActionResult> {
  const result = await apiAction(
    `/super-admin/roles-permissions/${value(formData, 'id')}`,
    'DELETE',
    undefined,
    'Failed to remove role grant',
  )
  if (result.success) revalidatePath('/super-admin/permissions')
  return result
}

export async function createFeatureFlagAction(formData: FormData): Promise<SuperAdminActionResult> {
  const result = await apiAction('/super-admin/features', 'POST', {
    feature_name: value(formData, 'feature_name'),
    is_enabled: value(formData, 'is_enabled') === 'on',
    description: optionalValue(formData, 'description'),
  }, 'Failed to create feature flag')
  if (result.success) revalidatePath('/super-admin/features')
  return result
}

export async function setFeatureFlagEnabledAction(formData: FormData): Promise<SuperAdminActionResult> {
  const id = value(formData, 'id')
  const result = await apiAction(`/super-admin/features/${id}`, 'PUT', {
    is_enabled: value(formData, 'is_enabled') === 'true',
  }, 'Failed to update feature flag')
  if (result.success) revalidatePath('/super-admin/features')
  return result
}

export async function updateFeatureFlagDescriptionAction(formData: FormData): Promise<SuperAdminActionResult> {
  const id = value(formData, 'id')
  const result = await apiAction(`/super-admin/features/${id}`, 'PUT', {
    description: optionalValue(formData, 'description'),
  }, 'Failed to update feature flag description')
  if (result.success) revalidatePath('/super-admin/features')
  return result
}

export async function setAdminActiveAction(formData: FormData): Promise<SuperAdminActionResult> {
  const id = value(formData, 'id')
  const action = value(formData, 'is_active') === 'true' ? 'activate' : 'deactivate'
  const result = await apiAction(
    `/super-admin/admins/${id}/${action}`,
    'PUT',
    undefined,
    `Failed to ${action} administrator`,
  )
  if (result.success) revalidatePath('/super-admin/admins')
  return result
}

export async function resetAdminPasswordAction(formData: FormData): Promise<SuperAdminActionResult> {
  const id = value(formData, 'id')
  const newPasswordEntry = formData.get('new_password')
  const confirmPasswordEntry = formData.get('confirm_password')
  const newPassword = typeof newPasswordEntry === 'string' ? newPasswordEntry : ''
  const confirmPassword = typeof confirmPasswordEntry === 'string' ? confirmPasswordEntry : ''

  if (!newPassword) return { error: 'Enter a new password.' }
  if (newPassword !== confirmPassword) return { error: 'Passwords do not match.' }

  const result = await apiAction(
    `/super-admin/admins/${id}/reset-password`,
    'PATCH',
    { new_password: newPassword },
    'Failed to reset administrator password',
  )
  if (result.success) {
    revalidatePath('/super-admin/admins')
    revalidatePath(`/super-admin/admins/${id}`)
  }
  return result
}
