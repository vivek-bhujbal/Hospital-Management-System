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

export async function registerPatientAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    age: formData.get('age') ? parseInt(formData.get('age') as string) : null,
    gender: formData.get('gender') || null,
    contact: formData.get('contact'),
    address: formData.get('address'),
    blood_group: formData.get('blood_group')
  }

  const res = await fetch(`${API_URL}/patients/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) return { error: "Failed to register patient" }

  revalidatePath('/receptionist/home')
  redirect('/receptionist/home')
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

  if (!res.ok) return { error: "Failed to book appointment" }
  revalidatePath('/receptionist/schedule')
  redirect('/receptionist/queue')
}

export async function checkinAction(formData: FormData) {
  const id = formData.get('id')
  const res = await fetch(`${API_URL}/appointments/${id}/checkin`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  })
  if (!res.ok) return { error: "Check-in failed" }
  revalidatePath('/receptionist/queue')
}

export async function collectPaymentAction(formData: FormData) {
  const id = formData.get('id')
  const payment_method = formData.get('payment_method')
  
  const res = await fetch(`${API_URL}/billing/${id}/collect?payment_method=${payment_method}`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  
  if (!res.ok) return { error: "Payment collection failed" }
  revalidatePath('/receptionist/billing')
}
