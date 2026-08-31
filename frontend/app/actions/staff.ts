'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8000'

export interface StaffActionResult {
  error?: string
  success?: boolean
}

function headers(): Record<string, string> {
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
    return payload.detail
      .map((entry) => typeof entry === 'object' && entry !== null && 'msg' in entry
        ? String((entry as { msg: unknown }).msg)
        : String(entry))
      .join(', ')
  }
  return fallback
}

function optionalString(formData: FormData, key: string): string | null {
  const value = formData.get(key)
  if (typeof value !== 'string' || value.trim() === '') return null
  return value.trim()
}

export async function createAdminAccountAction(
  formData: FormData,
): Promise<StaffActionResult> {
  const response = await fetch(`${API_URL}/super-admin/admins`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: optionalString(formData, 'name'),
      email: optionalString(formData, 'email'),
      password: formData.get('password'),
    }),
  })
  if (response.status === 401) redirect('/login')
  if (!response.ok) {
    return { error: await errorDetail(response, 'Failed to create administrator') }
  }
  revalidatePath('/super-admin/admins')
  return { success: true }
}

export async function createStaffAccountAction(
  formData: FormData,
): Promise<StaffActionResult> {
  const response = await fetch(`${API_URL}/admin/staff`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: optionalString(formData, 'name'),
      email: optionalString(formData, 'email'),
      password: formData.get('password'),
      role: formData.get('role'),
      specialization: optionalString(formData, 'specialization'),
      consultation_fee: optionalString(formData, 'consultation_fee'),
      contact: optionalString(formData, 'contact'),
      timing_start: optionalString(formData, 'timing_start'),
      timing_end: optionalString(formData, 'timing_end'),
      designation: optionalString(formData, 'designation'),
      joining_date: optionalString(formData, 'joining_date'),
      shift_start: optionalString(formData, 'shift_start'),
      shift_end: optionalString(formData, 'shift_end'),
    }),
  })
  if (response.status === 401) redirect('/login')
  if (!response.ok) {
    return { error: await errorDetail(response, 'Failed to create staff account') }
  }
  revalidatePath('/admin/staff')
  return { success: true }
}

export async function setHospitalManagerActiveAction(
  formData: FormData,
): Promise<StaffActionResult> {
  const id = optionalString(formData, 'id')
  const shouldActivate = formData.get('is_active') === 'true'
  const action = shouldActivate ? 'activate' : 'deactivate'
  const response = await fetch(`${API_URL}/admin/hospital-managers/${id}/${action}`, {
    method: 'PUT',
    headers: headers(),
  })
  if (response.status === 401) redirect('/login')
  if (!response.ok) {
    return { error: await errorDetail(response, `Failed to ${action} Hospital Manager`) }
  }
  revalidatePath('/admin/staff')
  return { success: true }
}
