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

export interface MedicineCategory { id: number; name: string; description: string | null }
export interface Supplier { id: number; name: string; contact_person: string | null }
export interface Medicine {
  id: number
  name: string
  sku: string | null
  generic_name: string | null
  category_id: number
  unit: string | null
  status: 'active' | 'inactive'
}
export interface InventoryBatch {
  id: number
  medicine_id: number
  medicine_name: string
  sku: string | null
  supplier_id: number | null
  supplier_name: string | null
  batch_number: string
  expiry_date: string
  purchase_price: string
  selling_price: string
  quantity: number
  available_quantity: number
  stock_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired'
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
  if (status === 'low_stock') return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  return 'bg-slate-100 text-slate-700 ring-slate-500/20'
}
