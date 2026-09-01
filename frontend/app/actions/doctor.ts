'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  const token = cookies().get('token')?.value
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

function formValue(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

async function responseError(res: Response, fallback: string): Promise<string> {
  if (res.status === 401) redirect('/session-expired')
  if (res.status === 403) return 'You are not authorized to access this resource.'
  try {
    const body = await res.json()
    return typeof body.detail === 'string' ? body.detail : fallback
  } catch {
    return fallback
  }
}

function revalidateDoctorAppointment(appointmentId: number, patientId?: number) {
  revalidatePath('/doctor/home')
  revalidatePath('/doctor/appointments')
  revalidatePath('/doctor/consultation')
  if (patientId && Number.isInteger(patientId)) {
    revalidatePath(`/doctor/patients/${patientId}`)
  }
}

export async function confirmAssignedAppointmentAction(formData: FormData) {
  const appointmentId = Number(formValue(formData, 'appointment_id'))
  const patientId = Number(formValue(formData, 'patient_id'))
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    return { error: 'Select a valid appointment.' }
  }

  const res = await fetch(`${API_URL}/appointments/${appointmentId}/confirm`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return { error: await responseError(res, 'Unable to confirm appointment.') }

  revalidateDoctorAppointment(appointmentId, patientId)
  return { success: true }
}

export async function startConsultationAction(formData: FormData) {
  const appointmentId = Number(formValue(formData, 'appointment_id'))
  if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
    return { error: 'Select a valid appointment.' }
  }

  const res = await fetch(`${API_URL}/appointments/${appointmentId}/start`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) return { error: await responseError(res, 'Unable to start consultation.') }

  revalidateDoctorAppointment(appointmentId)
  redirect(`/doctor/consultation?appointment_id=${appointmentId}`)
}

export async function completeConsultationAction(formData: FormData) {
  const appointmentId = Number(formValue(formData, 'appointment_id'))
  const diagnosis = formValue(formData, 'diagnosis')
  const medicine = formValue(formData, 'medicine')
  const dosage = formValue(formData, 'dosage')
  const instructions = formValue(formData, 'instructions')
  const clinicalNotes = formValue(formData, 'clinical_notes')
  if (!Number.isInteger(appointmentId) || appointmentId <= 0 || !diagnosis || !medicine || !dosage) {
    return { error: 'Appointment, diagnosis, medicines, and dosage are required.' }
  }
  const notes = [
    instructions ? `Instructions: ${instructions}` : '',
    clinicalNotes ? `Clinical notes: ${clinicalNotes}` : '',
  ].filter(Boolean).join('\n\n') || null
  const payload = {
    appointment_id: appointmentId,
    diagnosis,
    medicine,
    dosage,
    notes,
  }

  const res = await fetch(`${API_URL}/prescriptions/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) return { error: await responseError(res, 'Unable to complete consultation.') }

  revalidatePath('/doctor/home')
  revalidatePath('/doctor/appointments')
  revalidatePath('/doctor/patients')
  revalidatePath('/doctor/consultation')
  redirect('/doctor/home')
}

export async function updateDoctorProfileAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    specialization: formData.get('specialization'),
    contact: formData.get('contact'),
    timing_start: formData.get('timing_start') || null,
    timing_end: formData.get('timing_end') || null,
  }

  const res = await fetch(`${API_URL}/doctors/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) return { error: await responseError(res, 'Unable to update profile.') }

  revalidatePath('/doctor/profile')
  revalidatePath('/doctor/home')
  return { success: true }
}
