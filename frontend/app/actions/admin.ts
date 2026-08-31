'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  const token = cookies().get('token')?.value;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

export async function addDoctorAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    specialization: formData.get('specialization'),
    consultation_fee: formData.get('consultation_fee'),
    contact: formData.get('contact'),
    timing_start: formData.get('timing_start') || null,
    timing_end: formData.get('timing_end') || null,
    status: formData.get('status') || 'active'
  }

  const res = await fetch(`${API_URL}/admin/doctors`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    if (res.status === 401) {
      redirect('/login');
    }
    const errorData = await res.json().catch(()=>({}))
    return { error: errorData.detail || "Failed to add doctor" }
  }
  revalidatePath('/admin/doctors')
  
  // Return success explicitly to handle UI modal state
  return { success: true }
}

export async function editDoctorAction(formData: FormData) {
  const id = formData.get('id')
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    specialization: formData.get('specialization'),
    consultation_fee: formData.get('consultation_fee'),
    contact: formData.get('contact'),
    timing_start: formData.get('timing_start') || null,
    timing_end: formData.get('timing_end') || null,
    status: formData.get('status') || 'active'
  }

  const res = await fetch(`${API_URL}/admin/doctors/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) return { error: "Failed to update doctor" }
  revalidatePath('/admin/doctors')
  redirect('/admin/doctors')
}

export async function deleteDoctorAction(formData: FormData) {
  const id = formData.get('id')
  const res = await fetch(`${API_URL}/admin/doctors/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!res.ok) return { error: "Failed to delete doctor" }
  revalidatePath('/admin/doctors')
}

export async function resetDoctorPasswordAction(id: number, new_password: string) {
  const payload = { new_password };
  const res = await fetch(`${API_URL}/admin/doctors/${id}/reset-password`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const errorData = await res.json().catch(()=>({}))
    return { error: errorData.detail || "Failed to reset password" }
  }
  return { success: true }
}

export async function addEmployeeAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    designation: formData.get('designation'),
    shift_start: formData.get('shift_start') || null,
    shift_end: formData.get('shift_end') || null,
  }

  const res = await fetch(`${API_URL}/admin/employees/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const errorData = await res.json().catch(()=>({}))
    return { error: errorData.detail || "Failed to add employee" }
  }
  revalidatePath('/admin/employees')
}

export async function updateEmployeeAction(formData: FormData): Promise<void> {
  const id = formData.get('id')
  const payload = {
    designation: formData.get('designation'),
    shift_start: formData.get('shift_start') || null,
    shift_end: formData.get('shift_end') || null,
  }
  const res = await fetch(`${API_URL}/admin/employees/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (res.status === 401) redirect('/login')
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    throw new Error(errorData.detail || 'Failed to update employee')
  }
  revalidatePath('/admin/employees')
}

type EmployeeStatus = 'active' | 'inactive'
type EmployeeStatusResult = { success?: boolean; error?: string }

export async function updateEmployeeStatusAction(
  id: number,
  status: EmployeeStatus,
): Promise<EmployeeStatusResult> {
  if (!Number.isInteger(id) || id <= 0 || !['active', 'inactive'].includes(status)) {
    return { error: 'Invalid employee status update' }
  }

  const res = await fetch(`${API_URL}/admin/employees/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })

  if (res.status === 401) redirect('/session-expired')
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}))
    return { error: errorData.detail || 'Failed to update employee status' }
  }

  revalidatePath('/admin/employees')
  return { success: true }
}

export async function updateEmployeePermissionsAction(formData: FormData): Promise<any> {
  const id = formData.get('id')
  const payload = {
    can_register_patient: formData.get('can_register_patient') === 'on',
    can_schedule_appointment: formData.get('can_schedule_appointment') === 'on',
    can_checkin_patient: formData.get('can_checkin_patient') === 'on',
    can_collect_billing: formData.get('can_collect_billing') === 'on',
  }

  const res = await fetch(`${API_URL}/admin/employees/${id}/permissions`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) return { error: "Failed to update permissions" }
  revalidatePath(`/admin/employees/${id}/permissions`)
  revalidatePath('/admin/employees')
  redirect('/admin/employees')
}
