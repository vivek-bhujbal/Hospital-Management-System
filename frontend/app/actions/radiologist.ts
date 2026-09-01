'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export interface RadiologistActionResult { success?: boolean; error?: string }
function headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${cookies().get('token')?.value}` } }
function value(data: FormData, key: string) { const item = data.get(key); return typeof item === 'string' ? item.trim() : '' }
async function complete(response: Response, fallback: string, orderId?: string): Promise<RadiologistActionResult> {
  if (response.ok) { revalidatePath('/radiologist/home'); revalidatePath('/radiologist/orders'); revalidatePath('/radiologist/reports'); if (orderId) revalidatePath(`/radiologist/orders/${orderId}`); return { success: true } }
  if (response.status === 401) redirect('/session-expired')
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null
  if (typeof payload?.detail === 'string') return { error: payload.detail }
  if (Array.isArray(payload?.detail)) return { error: payload.detail.map((item: any) => item.msg || String(item)).join(', ') }
  return { error: fallback }
}
export async function recordImagingStudyAction(data: FormData) {
  const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/radiology/orders/${orderId}/study`, { method: 'POST', headers: headers(), body: JSON.stringify({ order_id: Number(orderId), study_identifier: value(data, 'study_identifier'), storage_reference: value(data, 'storage_reference') || null }) }), 'Unable to record imaging study.', orderId)
}
export async function startImagingReviewAction(data: FormData) {
  const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/radiology/orders/${orderId}/start-review`, { method: 'POST', headers: headers() }), 'Unable to start imaging review.', orderId)
}
function reportPayload(data: FormData) { return { findings: value(data, 'findings') || null, impression: value(data, 'impression') || null, recommendations: value(data, 'recommendations') || null, radiologist_notes: value(data, 'radiologist_notes') || null } }
export async function createRadiologyReportAction(data: FormData) {
  const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/radiology/reports`, { method: 'POST', headers: headers(), body: JSON.stringify({ study_id: Number(value(data, 'study_id')), ...reportPayload(data) }) }), 'Unable to create report.', orderId)
}
export async function updateRadiologyReportAction(data: FormData) {
  const reportId = value(data, 'report_id'); const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/radiology/reports/${reportId}`, { method: 'PUT', headers: headers(), body: JSON.stringify(reportPayload(data)) }), 'Unable to update draft report.', orderId)
}
export async function finalizeRadiologyReportAction(data: FormData) {
  const reportId = value(data, 'report_id'); const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/radiology/reports/${reportId}/finalize`, { method: 'POST', headers: headers() }), 'Unable to finalize report.', orderId)
}
export async function amendRadiologyReportAction(data: FormData) {
  const reportId = value(data, 'report_id'); const orderId = value(data, 'order_id')
  return complete(await fetch(`${API_URL}/radiology/reports/${reportId}/amend`, { method: 'POST', headers: headers(), body: JSON.stringify({ amendment_reason: value(data, 'amendment_reason'), ...reportPayload(data) }) }), 'Unable to create report amendment.', orderId)
}
