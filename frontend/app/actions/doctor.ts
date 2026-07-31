'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  const token = cookies().get('token')?.value;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

export async function completeConsultationAction(formData: FormData) {
  const payload = {
    appointment_id: parseInt(formData.get('appointment_id') as string),
    diagnosis: formData.get('diagnosis'),
    medicine: formData.get('medicine'),
    dosage: formData.get('dosage'),
    notes: formData.get('notes')
  }

  const res = await fetch(`${API_URL}/prescriptions/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(text)
    return { error: "Failed to complete consultation" }
  }

  revalidatePath('/doctor/home')
  revalidatePath('/doctor/appointments')
  redirect('/doctor/home')
}

export async function updateDoctorProfileAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    specialization: formData.get('specialization'),
    contact: formData.get('contact'),
    timing_start: formData.get('timing_start') || null,
    timing_end: formData.get('timing_end') || null,
    status: formData.get('status') || 'active'
  }

  const res = await fetch(`${API_URL}/doctors/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) return { error: "Failed to update profile" }

  revalidatePath('/doctor/profile')
}
