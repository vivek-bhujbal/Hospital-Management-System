'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
export interface InsuranceActionResult { success?: boolean; error?: string }
function value(data: FormData, key: string) { const item = data.get(key); return typeof item === 'string' ? item.trim() : '' }
function headers() { return { 'Content-Type': 'application/json', Authorization: `Bearer ${cookies().get('token')?.value}` } }
async function complete(response: Response, fallback: string, claimId?: string): Promise<InsuranceActionResult> {
  if (response.ok) {
    for (const path of ['/insurance/home', '/insurance/patients', '/insurance/claims', '/insurance/approvals']) revalidatePath(path)
    if (claimId) revalidatePath(`/insurance/claims/${claimId}`)
    return { success: true }
  }
  if (response.status === 401) redirect('/session-expired')
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null
  if (typeof payload?.detail === 'string') return { error: payload.detail }
  if (Array.isArray(payload?.detail)) return { error: payload.detail.map((item: any) => item.msg || String(item)).join(', ') }
  return { error: fallback }
}

export async function createInsuranceProviderAction(data: FormData) {
  return complete(await fetch(`${API_URL}/insurance/providers`, { method: 'POST', headers: headers(), body: JSON.stringify({ name: value(data, 'name'), contact_info: value(data, 'contact_info') || null, status: 'active' }) }), 'Unable to create provider.')
}
export async function createInsurancePolicyAction(data: FormData) {
  return complete(await fetch(`${API_URL}/insurance/policies`, { method: 'POST', headers: headers(), body: JSON.stringify({ patient_id: Number(value(data, 'patient_id')), provider_id: Number(value(data, 'provider_id')), policy_number: value(data, 'policy_number'), coverage_start: value(data, 'coverage_start'), coverage_end: value(data, 'coverage_end'), coverage_limit: value(data, 'coverage_limit') || null, status: 'active' }) }), 'Unable to create policy.')
}
export async function createInsuranceClaimAction(data: FormData) {
  return complete(await fetch(`${API_URL}/insurance/claims`, { method: 'POST', headers: headers(), body: JSON.stringify({ policy_id: Number(value(data, 'policy_id')), billing_id: Number(value(data, 'billing_id')), amount_claimed: value(data, 'amount_claimed') }) }), 'Unable to create claim.')
}
async function claimAction(data: FormData, suffix: string, body?: object) {
  const claimId = value(data, 'claim_id')
  return complete(await fetch(`${API_URL}/insurance/claims/${claimId}/${suffix}`, { method: 'POST', headers: headers(), ...(body ? { body: JSON.stringify(body) } : {}) }), 'Unable to update claim.', claimId)
}
export async function submitInsuranceClaimAction(data: FormData) { return claimAction(data, 'submit') }
export async function startInsuranceReviewAction(data: FormData) { return claimAction(data, 'start-review') }
export async function requestInsuranceDocumentsAction(data: FormData) { return claimAction(data, 'request-documents', { reason: value(data, 'reason') }) }
export async function linkInsuranceDocumentAction(data: FormData) { const claimId = value(data, 'claim_id'); return claimAction(data, 'documents', { claim_id: Number(claimId), document_reference: value(data, 'document_reference') }) }
export async function decideInsuranceClaimAction(data: FormData) { return claimAction(data, 'decision', { decision: value(data, 'decision'), reason: value(data, 'reason'), approved_amount: value(data, 'approved_amount') || null }) }
export async function settleInsuranceClaimAction(data: FormData) { return claimAction(data, 'settle', { amount_paid: value(data, 'amount_paid'), payment_date: value(data, 'payment_date'), transaction_reference: value(data, 'transaction_reference'), reason: value(data, 'reason') }) }
