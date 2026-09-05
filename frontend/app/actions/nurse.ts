'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface NurseActionResult {
  success?: boolean
  error?: string
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cookies().get('token')?.value}`,
  }
}

function value(formData: FormData, key: string): string {
  const item = formData.get(key)
  return typeof item === 'string' ? item.trim() : ''
}

function optionalValue(formData: FormData, key: string): string | null {
  return value(formData, key) || null
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null
  if (response.status === 401) redirect('/session-expired')
  if (typeof payload?.detail === 'string') return payload.detail
  if (Array.isArray(payload?.detail)) {
    return payload.detail.map((item) => {
      if (typeof item === 'object' && item !== null && 'msg' in item) {
        return String((item as { msg: unknown }).msg)
      }
      return String(item)
    }).join(', ')
  }
  return fallback
}

function revalidateNurse(patientId?: string) {
  revalidatePath('/nurse/home')
  revalidatePath('/nurse/patients')
  revalidatePath('/nurse/appointments')
  revalidatePath('/nurse/vitals')
  revalidatePath('/nurse/tasks')
  revalidatePath('/nurse/history')
  if (patientId) {
    revalidatePath(`/nurse/patient/${patientId}`)
    revalidatePath(`/nurse/history/${patientId}`)
  }
}

export async function recordVitalsAction(formData: FormData): Promise<NurseActionResult> {
  const patientId = value(formData, 'patient_id')
  const response = await fetch(`${API_URL}/nurse/vitals`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      patient_id: Number(patientId),
      appointment_id: optionalValue(formData, 'appointment_id')
        ? Number(value(formData, 'appointment_id'))
        : null,
      temperature: optionalValue(formData, 'temperature'),
      blood_pressure_systolic: optionalValue(formData, 'blood_pressure_systolic'),
      blood_pressure_diastolic: optionalValue(formData, 'blood_pressure_diastolic'),
      pulse: optionalValue(formData, 'pulse'),
      respiratory_rate: optionalValue(formData, 'respiratory_rate'),
      oxygen_saturation: optionalValue(formData, 'oxygen_saturation'),
      weight: optionalValue(formData, 'weight'),
      height: optionalValue(formData, 'height'),
      notes: optionalValue(formData, 'notes'),
    }),
  })
  if (!response.ok) return { error: await errorMessage(response, 'Unable to record vitals.') }
  revalidateNurse(patientId)
  return { success: true }
}

export async function addNursingNoteAction(formData: FormData): Promise<NurseActionResult> {
  const patientId = value(formData, 'patient_id')
  const response = await fetch(`${API_URL}/nurse/notes`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      patient_id: Number(patientId),
      appointment_id: optionalValue(formData, 'appointment_id')
        ? Number(value(formData, 'appointment_id'))
        : null,
      note: value(formData, 'note'),
    }),
  })
  if (!response.ok) return { error: await errorMessage(response, 'Unable to add nursing observation.') }
  revalidateNurse(patientId)
  return { success: true }
}

export async function updateNursingTaskAction(formData: FormData): Promise<NurseActionResult> {
  const taskId = value(formData, 'task_id')
  const patientId = value(formData, 'patient_id')
  const response = await fetch(`${API_URL}/nurse/tasks/${taskId}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ status: value(formData, 'status') }),
  })
  if (!response.ok) return { error: await errorMessage(response, 'Unable to update nursing task.') }
  revalidateNurse(patientId)
  return { success: true }
}
