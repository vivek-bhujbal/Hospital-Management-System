'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  const token = cookies().get('token')?.value;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

async function getActionError(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as {
    detail?: string | Array<{ msg?: string }>
  }

  if (typeof body.detail === 'string') return body.detail
  if (Array.isArray(body.detail)) {
    const messages = body.detail.map((item) => item.msg).filter(Boolean)
    if (messages.length) return messages.join(', ')
  }
  return fallback
}

export async function bookAppointmentAction(formData: FormData) {
  const payload = {
    patient_id: parseInt(formData.get('patient_id') as string),
    doctor_id: parseInt(formData.get('doctor_id') as string),
    appt_date: formData.get('appt_date'),
    appt_time: formData.get('appt_time'),
    reason: formData.get('reason')?.toString().trim() || null
  }

  const res = await fetch(`${API_URL}/appointments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    return { error: await getActionError(res, 'Failed to book appointment') }
  }

  revalidatePath('/patient/appointments')
  revalidatePath('/patient/home')
  return { success: true }
}

export async function updateProfileAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    age: formData.get('age') ? parseInt(formData.get('age') as string) : null,
    gender: formData.get('gender') || null,
    contact: formData.get('contact'),
    blood_group: formData.get('blood_group'),
    address: formData.get('address')
  }

  const res = await fetch(`${API_URL}/patients/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    console.error(await res.text())
    return { error: "Failed to update profile" }
  }

  revalidatePath('/patient/profile')
  revalidatePath('/patient/home')
}
