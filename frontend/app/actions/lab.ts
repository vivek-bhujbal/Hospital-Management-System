'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export interface LabActionResult { success?: boolean; error?: string }
function headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${cookies().get('token')?.value}` } }
function value(data: FormData, key: string) { const item = data.get(key); return typeof item === 'string' ? item.trim() : '' }
async function complete(response: Response, fallback: string, orderId?: string): Promise<LabActionResult> {
  if (response.ok) {
    revalidatePath('/lab/home'); revalidatePath('/lab/orders'); revalidatePath('/lab/results')
    if (orderId) revalidatePath(`/lab/orders/${orderId}`)
    return { success: true }
  }
  if (response.status === 401) redirect('/session-expired')
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null
  if (typeof payload?.detail === 'string') return { error: payload.detail }
  if (Array.isArray(payload?.detail)) return { error: payload.detail.map((item: any) => item.msg || String(item)).join(', ') }
  return { error: fallback }
}
export async function acceptLabOrderAction(data: FormData) {
  const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/lab/orders/${orderId}/accept`, { method: 'POST', headers: headers() }), 'Unable to accept order.', orderId)
}
export async function collectLabSampleAction(data: FormData) {
  const itemId = value(data, 'order_item_id'); const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/lab/order-items/${itemId}/sample`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ order_item_id: Number(itemId), sample_type: value(data, 'sample_type') || null, barcode: value(data, 'barcode') }),
  }), 'Unable to record sample.', orderId)
}
export async function startLabProcessingAction(data: FormData) {
  const itemId = value(data, 'order_item_id'); const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/lab/order-items/${itemId}/start`, { method: 'POST', headers: headers() }), 'Unable to start processing.', orderId)
}
function resultPayload(data: FormData) {
  return {
    order_item_id: Number(value(data, 'order_item_id')),
    result_value: value(data, 'result_value') || null,
    numeric_value: value(data, 'numeric_value') || null,
    unit: value(data, 'unit') || null,
    reference_range: value(data, 'reference_range') || null,
    remarks: value(data, 'remarks') || null,
  }
}
export async function enterLabResultAction(data: FormData) {
  const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/lab/results`, { method: 'POST', headers: headers(), body: JSON.stringify(resultPayload(data)) }), 'Unable to enter result.', orderId)
}
export async function updateLabResultAction(data: FormData) {
  const resultId = value(data, 'result_id'); const orderId = value(data, 'order_id')
  const payload = resultPayload(data); delete (payload as any).order_item_id
  return complete(await fetch(`${API_URL}/lab/results/${resultId}`, { method: 'PUT', headers: headers(), body: JSON.stringify(payload) }), 'Unable to update draft result.', orderId)
}
export async function finalizeLabResultAction(data: FormData) {
  const resultId = value(data, 'result_id'); const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/lab/results/${resultId}/finalize`, { method: 'POST', headers: headers() }), 'Unable to finalize result.', orderId)
}
