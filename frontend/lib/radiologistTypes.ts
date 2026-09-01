export type ImagingStatus = 'ordered' | 'scheduled' | 'performed' | 'reviewing' | 'reporting' | 'completed' | 'cancelled'
export type ImagingPriority = 'routine' | 'urgent' | 'stat'
export interface RadiologyReport {
  id: number; study_id: number; order_id: number; patient_id: number
  patient_name: string; radiologist_id: number; radiologist_name: string
  findings: string | null; impression: string | null; recommendations: string | null
  radiologist_notes: string | null; amendment_reason: string | null
  status: 'draft' | 'finalized'; version: number; parent_report_id: number | null
  created_at: string; updated_at: string; finalized_at: string | null
}
export interface RadiologyOrder {
  id: number; patient_id: number; patient_name: string; patient_age: number | null
  patient_gender: string | null; patient_contact: string | null
  doctor_id: number; doctor_name: string; appointment_id: number | null
  assigned_radiologist_id: number | null; modality_id: number; modality_name: string
  body_part: string | null; clinical_indication: string | null
  priority: ImagingPriority; status: ImagingStatus
  review_started_at: string | null; ordered_at: string
  study: null | { id: number; study_identifier: string; storage_reference: string | null; performed_at: string; recorded_by: number | null }
  reports: RadiologyReport[]
}
export interface RadiologyDashboard {
  pending_imaging_orders: number; scheduled_imaging: number
  studies_awaiting_interpretation: number; reports_pending: number
  completed_reports: number; urgent_cases: number
}
export function imagingLabel(value: string) { return value.replaceAll('_', ' ') }
export function imagingClass(value: string) {
  if (value === 'completed' || value === 'finalized') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (value === 'reviewing' || value === 'reporting') return 'bg-blue-50 text-blue-700 ring-blue-600/20'
  if (value === 'urgent' || value === 'stat' || value === 'performed') return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  if (value === 'cancelled') return 'bg-red-50 text-red-700 ring-red-600/20'
  return 'bg-slate-100 text-slate-700 ring-slate-500/20'
}
