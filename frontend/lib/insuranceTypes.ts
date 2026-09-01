export type ClaimStatus = 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'settled'

export interface InsuranceDashboard {
  pending_claims: number
  claims_under_review: number
  approved_claims: number
  rejected_claims: number
  claims_requiring_documents: number
  total_claimed_amount: string | number
  approved_amount: string | number
}

export interface InsurancePatient {
  patient_id: number
  patient_name: string
  provider_id: number | null
  provider_name: string | null
  policy_id: number | null
  policy_number: string | null
  policy_status: 'active' | 'expired' | 'suspended' | null
  coverage_start: string | null
  coverage_end: string | null
  coverage_limit: string | number | null
}

export interface InsuranceProvider {
  id: number
  name: string
  contact_info: string | null
  status: 'active' | 'inactive'
}

export interface Claim {
  id: number
  patient_id: number
  patient_name: string
  provider_id: number
  provider_name: string
  policy_id: number
  policy_number: string
  policy_status: string
  billing_id: number
  invoice_amount: string | number
  amount_claimed: string | number
  approved_amount: string | number | null
  status: ClaimStatus
  documents_required: boolean
  officer_id: number
  submitted_at: string | null
  decided_at: string | null
  settled_at: string | null
  created_at: string
  updated_at: string
}

export interface ClaimOptions {
  policies: { id: number; patient_id: number; patient_name: string; provider_name: string; policy_number: string; coverage_limit: string | number | null }[]
  invoices: { id: number; patient_id: number; patient_name: string; amount: string | number; status: string }[]
}

export interface ClaimDetail extends Claim {
  documents: { id: number; document_reference: string; linked_by: number | null; linked_by_name: string | null; uploaded_at: string }[]
  history: { id: number; action: string; from_status: string | null; to_status: string | null; reason: string | null; officer_id: number; officer_name: string; created_at: string }[]
  payments: { id: number; amount_paid: string | number; payment_date: string; transaction_reference: string; recorded_by_name: string }[]
}

export function insuranceMoney(value: string | number | null): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 2,
  }).format(Number(value || 0))
}

export function claimStatusClass(status: ClaimStatus): string {
  if (status === 'approved' || status === 'settled') return 'bg-emerald-100 text-emerald-800'
  if (status === 'rejected') return 'bg-red-100 text-red-800'
  if (status === 'under_review') return 'bg-blue-100 text-blue-800'
  return 'bg-amber-100 text-amber-800'
}
