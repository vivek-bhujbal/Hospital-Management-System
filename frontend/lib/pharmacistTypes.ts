export type PharmacyStatus = 'pending' | 'verified' | 'rejected' | 'ready_for_dispensing' | 'dispensed'

export interface PharmacyPrescription {
  id: number
  appointment_id: number
  patient_id: number
  patient_name: string
  doctor_id: number
  doctor_name: string
  diagnosis: string | null
  medicine: string | null
  dosage: string | null
  instructions: string | null
  prescription_date: string
  appointment_date: string
  appointment_status: string
  pharmacy_status: PharmacyStatus
  rejection_reason: string | null
  dispensing_id: number | null
}

export interface PharmacyDashboardData {
  pending_prescriptions: number
  ready_for_dispensing: number
  low_stock_medicines: number
  out_of_stock_medicines: number
  today_dispensed_medicines: number
  alerts: { expired_batches: number; rejected_prescriptions: number }
  recent_prescriptions: PharmacyPrescription[]
}

export interface MedicineCategory { id: number; name: string; description: string | null; status: 'active' | 'inactive'; created_at: string; updated_at: string | null }
export interface Supplier { id: number; name: string; contact_person: string | null; email: string | null; phone: string | null; address: string | null; status: 'active' | 'inactive'; created_at: string; updated_at: string | null }
export interface Medicine {
  id: number
  name: string
  sku: string | null
  generic_name: string | null
  category_id: number
  unit: string | null
  specializations: string[]
  minimum_stock_level: number
  category_name?: string | null
  description?: string | null
  created_at?: string
  updated_at?: string | null
  status: 'active' | 'inactive'
}
export interface InventoryBatch {
  id: number
  medicine_id: number
  medicine_name: string
  generic_name: string | null
  sku: string | null
  category_id: number | null
  category_name: string | null
  unit: string | null
  minimum_stock_level: number
  supplier_id: number | null
  supplier_name: string | null
  supplier_status: 'active' | 'inactive' | null
  batch_number: string
  expiry_date: string
  purchase_price: string
  selling_price: string
  quantity: number
  available_quantity: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expiring_soon' | 'expired'
}

export interface InventorySummary {
  total_medicines: number
  total_stock_quantity: number
  low_stock_items: number
  expiring_soon: number
  expired_batches: number
  expiry_warning_days: number
}

export interface DispensingRecord {
  id: number
  prescription_id: number
  patient_id: number
  status: 'completed' | 'voided'
  dispensed_at: string
  dispensed_by: number
}

export function pharmacyStatusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

export function pharmacyStatusClass(status: string) {
  if (status === 'dispensed' || status === 'verified') return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  if (status === 'rejected' || status === 'expired' || status === 'out_of_stock') return 'bg-red-50 text-red-700 ring-red-600/20'
  if (status === 'ready_for_dispensing') return 'bg-blue-50 text-blue-700 ring-blue-600/20'
  if (status === 'low_stock' || status === 'expiring_soon') return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-slate-100 text-slate-700 ring-slate-500/20'
}
