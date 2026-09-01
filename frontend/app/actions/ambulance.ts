'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export interface AmbulanceActionResult { success?: boolean; error?: string }
function value(data: FormData, key: string) { const item = data.get(key); return typeof item === 'string' ? item.trim() : '' }
function headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${cookies().get('token')?.value}` } }
async function complete(response: Response, fallback: string, requestId?: string): Promise<AmbulanceActionResult> {
  if (response.ok) {
    for (const path of ['/ambulance/home', '/ambulance/requests', '/ambulance/trips', '/ambulance/vehicles']) revalidatePath(path)
    if (requestId) revalidatePath(`/ambulance/requests/${requestId}`)
    return { success: true }
  }
  if (response.status === 401) redirect('/session-expired')
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null
  if (typeof payload?.detail === 'string') return { error: payload.detail }
  if (Array.isArray(payload?.detail)) return { error: payload.detail.map((item: any) => item.msg || String(item)).join(', ') }
  return { error: fallback }
}

export async function createAmbulanceRequestAction(data: FormData) {
  const patientId = value(data, 'patient_id')
  return complete(await fetch(`${API_URL}/ambulance/requests`, { method: 'POST', headers: headers(), body: JSON.stringify({ patient_id: patientId ? Number(patientId) : null, requester_name: value(data, 'requester_name') || null, requester_contact: value(data, 'requester_contact') || null, pickup_location: value(data, 'pickup_location'), destination: value(data, 'destination'), priority: value(data, 'priority') || 'high' }) }), 'Unable to create ambulance request.')
}
export async function registerAmbulanceVehicleAction(data: FormData) {
  return complete(await fetch(`${API_URL}/ambulance/vehicles`, { method: 'POST', headers: headers(), body: JSON.stringify({ vehicle_number: value(data, 'vehicle_number'), vehicle_type: value(data, 'vehicle_type') || null, capacity: value(data, 'capacity') ? Number(value(data, 'capacity')) : null, status: value(data, 'status') || 'available' }) }), 'Unable to register ambulance.')
}
export async function updateAmbulanceAvailabilityAction(data: FormData) {
  return complete(await fetch(`${API_URL}/ambulance/vehicles/${value(data, 'vehicle_id')}/availability`, { method: 'PATCH', headers: headers(), body: JSON.stringify({ status: value(data, 'status') }) }), 'Unable to update ambulance availability.')
}
export async function acceptAmbulanceRequestAction(data: FormData) {
  const requestId = value(data, 'request_id')
  return complete(await fetch(`${API_URL}/ambulance/requests/${requestId}/accept`, { method: 'POST', headers: headers(), body: JSON.stringify({ ambulance_id: Number(value(data, 'ambulance_id')) }) }), 'Unable to accept assignment.', requestId)
}
export async function advanceAmbulanceTripAction(data: FormData) {
  const requestId = value(data, 'request_id')
  const action = value(data, 'action')
  if (!['start-trip', 'arrive', 'start-transport', 'complete'].includes(action)) return { error: 'Invalid ambulance action.' }
  return complete(await fetch(`${API_URL}/ambulance/requests/${requestId}/${action}`, { method: 'POST', headers: headers() }), 'Unable to update trip.', requestId)
}
