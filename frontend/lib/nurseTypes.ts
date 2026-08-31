export interface NurseTask {
  id: number
  patient_id: number
  patient_name: string
  assigned_nurse_id: number | null
  task_type: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'emergency'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  due_at: string | null
  completed_at: string | null
  created_at: string
}

export interface NurseDashboardData {
  today_assigned_patients: number
  waiting_patients: number
  patients_requiring_vitals: number
  patients_requiring_tasks: number
  active_tasks: number
  urgent_alerts: Array<{
    task_id: number
    patient_id: number
    patient_name: string
    priority: string
    description: string
    due_at: string | null
  }>
  upcoming_appointments: Array<{
    id: number
    patient_id: number
    patient_name: string
    doctor_name: string
    appt_date: string
    appt_time: string
    status: string
  }>
}

export interface NursePatient {
  id: number
  name: string
  age: number | null
  gender: string | null
  contact: string | null
  blood_group: string | null
  active_task_count: number
  urgent_task_count: number
  latest_appointment_date: string | null
  latest_appointment_status: string | null
}

export interface NurseAppointment {
  id: number
  patient_id: number
  patient_name: string
  doctor_id: number
  doctor_name: string
  appt_date: string
  appt_time: string
  reason: string | null
  status: string
  checked_in_at: string | null
  nursing_tasks: Array<{
    id: number
    task_type: string
    priority: string
    status: string
  }>
}

export interface NurseVital {
  id: number
  patient_id: number
  patient_name?: string
  appointment_id: number | null
  temperature: string | number | null
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  pulse: number | null
  respiratory_rate: number | null
  oxygen_saturation: string | number | null
  weight: string | number | null
  height: string | number | null
  notes: string | null
  recorded_by: number
  recorded_by_name?: string
  recorded_at: string
}

export interface NursePatientDetail {
  patient: {
    id: number
    name: string
    age: number | null
    gender: string | null
    contact: string | null
    blood_group: string | null
  }
  appointments: Array<{
    id: number
    doctor_name: string
    appt_date: string
    appt_time: string
    reason: string | null
    status: string
  }>
  prescriptions: Array<{
    id: number
    appointment_id: number
    diagnosis: string | null
    medicine: string | null
    dosage: string | null
    notes: string | null
    created_at: string
  }>
  vitals: NurseVital[]
  nursing_notes: Array<{
    id: number
    appointment_id: number | null
    note: string
    nurse_id: number
    nurse_name: string
    created_at: string
  }>
  tasks: NurseTask[]
}

export function shortTime(value: string): string {
  return value ? value.slice(0, 5) : '—'
}

export function statusLabel(value: string): string {
  return value.replaceAll('_', ' ')
}

export function priorityClass(priority: string): string {
  if (priority === 'emergency') return 'bg-red-100 text-red-800 ring-red-200'
  if (priority === 'high') return 'bg-orange-100 text-orange-800 ring-orange-200'
  if (priority === 'medium') return 'bg-amber-100 text-amber-800 ring-amber-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

export function statusClass(status: string): string {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800 ring-emerald-200'
  if (status === 'in_progress' || status === 'checked_in') return 'bg-blue-100 text-blue-800 ring-blue-200'
  if (status === 'cancelled') return 'bg-slate-100 text-slate-600 ring-slate-200'
  return 'bg-amber-100 text-amber-800 ring-amber-200'
}
