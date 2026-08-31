export type LabPriority = 'routine' | 'urgent' | 'stat'
export type LabWorkStatus = 'ordered' | 'sample_collected' | 'processing' | 'completed' | 'cancelled'
export type LabResultStatus = 'draft' | 'finalized'

export interface LabResult {
  id: number
  order_item_id: number
  order_id: number
  patient_id: number
  patient_name: string
  test_id: number
  test_name: string
  technician_id: number
  technician_name: string
  result_value: string | null
  numeric_value: string | null
  unit: string | null
  reference_range: string | null
  remarks: string | null
  status: LabResultStatus
  created_at: string
  updated_at: string
  finalized_at: string | null
}

export interface LabOrderItem {
  id: number
  test_id: number
  test_name: string
  test_code: string | null
  status: LabWorkStatus
  sample: null | { id: number; sample_type: string | null; barcode: string; collected_by: number; collected_at: string }
  result: LabResult | null
}

export interface LabOrder {
  id: number
  patient_id: number
  patient_name: string
  patient_age: number | null
  patient_gender: string | null
  patient_contact: string | null
  doctor_id: number
  doctor_name: string
  appointment_id: number | null
  assigned_technician_id: number | null
  instructions: string | null
  priority: LabPriority
  status: LabWorkStatus
  accepted_at: string | null
  ordered_at: string
  items: LabOrderItem[]
}

export interface LabDashboard {
  pending_lab_orders: number
  samples_collected: number
  tests_in_progress: number
  completed_tests: number
  urgent_tests: number
  today_workload: number
}

export function labLabel(value: string) { return value.replaceAll('_', ' ') }
export function labStatusClass(value: string) {
  if (value === 'completed' || value === 'finalized') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (value === 'processing') return 'bg-blue-50 text-blue-700 ring-blue-600/20'
  if (value === 'cancelled') return 'bg-red-50 text-red-700 ring-red-600/20'
  if (value === 'sample_collected' || value === 'urgent' || value === 'stat') return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-slate-100 text-slate-700 ring-slate-500/20'
}
