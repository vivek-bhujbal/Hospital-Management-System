'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ActionResult<T = Record<string, unknown>> {
  success?: boolean
  data?: T
  error?: string
}

function getAuthHeaders() {
  const token = cookies().get('token')?.value
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => ({})) as { detail?: string }
  if (response.status === 401 || (
    response.status === 403 && body.detail === 'Your account has been disabled.'
  )) {
    redirect('/session-expired')
  }
  return body.detail || fallback
}

export async function registerPatientAction(
  formData: FormData,
): Promise<ActionResult<{ id: number; name: string }>> {
  const ageValue = formData.get('age')?.toString().trim()
  const payload = {
    name: formData.get('name')?.toString().trim(),
    age: ageValue ? Number(ageValue) : null,
    gender: formData.get('gender') || null,
    contact: formData.get('contact')?.toString().trim() || null,
    address: formData.get('address')?.toString().trim() || null,
    blood_group: formData.get('blood_group')?.toString().trim().toUpperCase() || null,
  }

  const response = await fetch(`${API_URL}/patients/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    return { error: await errorMessage(response, 'Failed to register patient') }
  }

  const patient = await response.json() as { id: number; name: string }
  revalidatePath('/receptionist/home')
  revalidatePath('/receptionist/patients')
  revalidatePath('/receptionist/schedule')
  return { success: true, data: { id: patient.id, name: patient.name } }
}

export async function bookAppointmentAction(
  formData: FormData,
): Promise<ActionResult<{ id: number; status: string }>> {
  const payload = {
    patient_id: Number(formData.get('patient_id')),
    doctor_id: Number(formData.get('doctor_id')),
    appt_date: formData.get('appt_date'),
    appt_time: formData.get('appt_time'),
    reason: formData.get('reason')?.toString().trim() || null,
  }

  const response = await fetch(`${API_URL}/appointments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    return { error: await errorMessage(response, 'Failed to schedule appointment') }
  }

  const appointment = await response.json() as { id: number; status: string }
  revalidatePath('/receptionist/home')
  revalidatePath('/receptionist/queue')
  revalidatePath('/receptionist/patients')
  return { success: true, data: appointment }
}

export async function confirmAppointmentAction(
  formData: FormData,
): Promise<ActionResult> {
  const id = Number(formData.get('id'))
  const response = await fetch(`${API_URL}/appointments/${id}/confirm`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    return { error: await errorMessage(response, 'Appointment confirmation failed') }
  }
  revalidatePath('/receptionist/home')
  revalidatePath('/receptionist/queue')
  return { success: true }
}

export async function checkinAction(formData: FormData): Promise<ActionResult> {
  const id = Number(formData.get('id'))
  const response = await fetch(`${API_URL}/appointments/${id}/checkin`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    return { error: await errorMessage(response, 'Patient check-in failed') }
  }
  revalidatePath('/receptionist/home')
  revalidatePath('/receptionist/queue')
  return { success: true }
}

export async function collectPaymentAction(
  formData: FormData,
): Promise<ActionResult<{
  id: number
  status: string
  payment_method: 'cash' | 'card' | 'upi' | null
  receipt_no: string | null
  paid_at: string | null
}>> {
  const id = Number(formData.get('id'))
  const paymentMethod = formData.get('payment_method')?.toString() || ''
  if (!['cash', 'card', 'upi'].includes(paymentMethod)) {
    return { error: 'Select a valid payment method' }
  }

  const response = await fetch(
    `${API_URL}/billing/${id}/collect?payment_method=${encodeURIComponent(paymentMethod)}`,
    { method: 'POST', headers: getAuthHeaders() },
  )
  if (!response.ok) {
    return { error: await errorMessage(response, 'Payment collection failed') }
  }

  const bill = await response.json()
  revalidatePath('/receptionist/home')
  revalidatePath('/receptionist/billing')
  return { success: true, data: bill }
}
