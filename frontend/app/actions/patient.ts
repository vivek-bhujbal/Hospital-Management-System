'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  const token = cookies().get('token')?.value;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

export async function bookAppointmentAction(formData: FormData) {
  const payload = {
    patient_id: parseInt(formData.get('patient_id') as string),
    doctor_id: parseInt(formData.get('doctor_id') as string),
    appt_date: formData.get('appt_date'),
    appt_time: formData.get('appt_time'),
    reason: formData.get('reason')
  }

  const res = await fetch(`${API_URL}/appointments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    console.error(await res.text())
    return { error: "Failed to book appointment" }
  }

  revalidatePath('/patient/appointments')
  revalidatePath('/patient/home')
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
