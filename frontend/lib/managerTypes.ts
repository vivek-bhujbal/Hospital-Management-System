export type ManagerAppointmentStatus =
  | 'requested'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'

export interface ManagerDepartmentSummary {
  department_id: number
  name: string
  active_doctors: number
  today_appointments: number
}

export interface ManagerOverview {
  today_appointments: number
  total_appointments: number
  total_patients: number
  active_doctors: number
  active_staff: number
  completed_consultations: number
  total_completed_consultations: number
  pending_appointments: number
  operational_alerts: string[]
  patient_flow: Record<ManagerAppointmentStatus, number>
  department_summary: ManagerDepartmentSummary[]
}

export interface ManagerAppointment {
  id: number
  patient_id: number
  patient_name: string
  doctor_id: number
  doctor_name: string
  department_id: number | null
  department_name: string | null
  appt_date: string
  appt_time: string
  reason: string | null
  status: ManagerAppointmentStatus
  checked_in_at: string | null
}

export interface ManagerPatient {
  id: number
  name: string
  age: number | null
  gender: 'male' | 'female' | 'other' | null
  contact: string | null
  created_at: string
  appointment_count: number
  last_appointment_date: string | null
  next_appointment_date: string | null
}

export interface ManagerDoctor {
  id: number
  name: string
  specialization: string | null
  department_id: number | null
  department_name: string | null
  timing_start: string | null
  timing_end: string | null
  status: 'active' | 'on_leave'
  availability: string
  appointments_today: number
  appointments_pending: number
  appointments_completed: number
}

export interface ManagerStaff {
  id: number
  name: string
  role: string
  designation: string | null
  department_name: string | null
  shift_start: string | null
  shift_end: string | null
  status: 'active' | 'inactive'
  availability: string
}

export interface ManagerBill {
  id: number
  appointment_id: number
  patient_id: number
  patient_name: string
  amount: number | string
  status: 'pending' | 'paid'
  payment_method: 'cash' | 'card' | 'upi' | null
  paid_at: string | null
}

export interface ManagerDepartment {
  department_id: number
  name: string
  description: string | null
  status: 'active' | 'inactive'
}

export interface ManagerDailyReport {
  date: string
  patient_count: number
  appointment_count: number
  completed_consultations: number
  cancelled_appointments: number
  pending_bills: number
  paid_bills: number
  revenue_summary: number | string
  total_appointment_count: number
  total_completed_consultations: number
  total_paid_bills: number
  total_revenue_summary: number | string
}

export interface ManagerDoctorWorkload {
  doctor_id: number
  name: string
  appointments_completed: number
  appointments_pending: number
}

export interface ManagerDepartmentStats {
  department_id: number
  name: string
  doctor_count: number
  appointment_count: number
}

export function localDateValue(value: Date = new Date()): string {
  const offset = value.getTimezoneOffset()
  return new Date(value.getTime() - offset * 60_000).toISOString().split('T')[0]
}

export function shortTime(value: string | null): string {
  return value ? value.slice(0, 5) : 'Not assigned'
}

export function statusLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

export function appointmentStatusClass(status: ManagerAppointmentStatus): string {
  const classes: Record<ManagerAppointmentStatus, string> = {
    requested: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    confirmed: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    checked_in: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    in_progress: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
    cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  }
  return classes[status]
}
