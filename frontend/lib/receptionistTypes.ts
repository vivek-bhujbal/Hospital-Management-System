export interface ReceptionPatient {
  id: number
  user_id: number | null
  name: string
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  contact: string | null
  address: string | null
  blood_group: string | null
}

export interface ReceptionDoctor {
  id: number
  name: string
  specialization: string | null
  timing_start: string | null
  timing_end: string | null
  status: 'active' | 'on_leave'
}

export type AppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface ReceptionAppointment {
  id: number
  patient_id: number
  doctor_id: number
  appt_date: string
  appt_time: string
  reason: string | null
  status: AppointmentStatus
  checked_in_at: string | null
  created_at: string
}

export interface ReceptionBill {
  id: number
  patient_id: number
  appointment_id: number
  amount: string
  status: 'pending' | 'paid'
  payment_method: 'cash' | 'card' | 'upi' | null
  receipt_no: string | null
  paid_at: string | null
  created_at: string
}

export function dateValue(value: Date = new Date()): string {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60_000).toISOString().split('T')[0]
}

export function shortTime(value: string): string {
  return value.slice(0, 5)
}
