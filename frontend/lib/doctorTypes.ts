export type DoctorAppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface DoctorAppointment {
  id: number
  patient_id: number
  doctor_id: number
  appt_date: string
  appt_time: string
  reason: string | null
  status: DoctorAppointmentStatus
  checked_in_at: string | null
  created_at: string
}

export interface DoctorPatient {
  id: number
  user_id: number | null
  name: string
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  contact: string | null
  address: string | null
  blood_group: string | null
}

export interface DoctorProfile {
  id: number
  user_id: number | null
  name: string
  specialization: string | null
  consultation_fee: string | null
  timing_start: string | null
  timing_end: string | null
  contact: string | null
  status: 'active' | 'on_leave'
}

export interface DoctorPrescription {
  id: number
  appointment_id: number
  diagnosis: string | null
  medicine: string | null
  dosage: string | null
  notes: string | null
  created_at: string
}

export interface DoctorPatientHistory {
  patient: DoctorPatient
  appointments: DoctorAppointment[]
  prescriptions: DoctorPrescription[]
}

export function localDateValue(value: Date = new Date()): string {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60_000).toISOString().split('T')[0]
}

export function shortTime(value: string): string {
  return value.slice(0, 5)
}

export function statusLabel(status: DoctorAppointmentStatus): string {
  return status.replaceAll('_', ' ')
}

export function statusClass(status: DoctorAppointmentStatus): string {
  const classes: Record<DoctorAppointmentStatus, string> = {
    requested: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    confirmed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    checked_in: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    in_progress: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  }
  return classes[status]
}
