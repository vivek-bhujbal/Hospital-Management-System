'use client'

import { FormEvent, useMemo, useState, useTransition } from 'react'
import { CalendarDays, Clock3, Stethoscope } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { bookAppointmentAction } from '@/app/actions/patient'
import SubmitButton from '@/components/SubmitButton'
import { useToast } from '@/components/ToastProvider'

interface DoctorOption {
  id: number
  name: string
  specialization: string | null
  timing_start: string | null
  timing_end: string | null
}

interface PatientAppointment {
  doctor_id: number
  appt_date: string
  appt_time: string
  status: string
}

interface PatientAppointmentFormProps {
  patientId: number
  doctors: DoctorOption[]
  appointments: PatientAppointment[]
}

type SlotState = 'available' | 'past' | 'booked'

const APPOINTMENT_SLOT_MINUTES = 15

interface AppointmentSlot {
  time: string
  state: SlotState
}

function dateValue(date = new Date()): string {
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

function shortTime(value: string | null, fallback: string): string {
  return (value || fallback).slice(0, 5)
}

function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function displayTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number)
  const suffix = hours >= 12 ? 'PM' : 'AM'
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${suffix}`
}

export default function PatientAppointmentForm({ patientId, doctors, appointments }: PatientAppointmentFormProps) {
  const router = useRouter()
  const { showToast } = useToast()
  const [isPending, startTransition] = useTransition()
  const [doctorId, setDoctorId] = useState(doctors[0] ? String(doctors[0].id) : '')
  const [appointmentDate, setAppointmentDate] = useState(dateValue())
  const [appointmentTime, setAppointmentTime] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const selectedDoctor = doctors.find((doctor) => String(doctor.id) === doctorId)
  const today = dateValue()
  const appointmentSlots = useMemo<AppointmentSlot[]>(() => {
    if (!selectedDoctor || !appointmentDate) return []

    const start = toMinutes(shortTime(selectedDoctor.timing_start, '09:00'))
    const end = toMinutes(shortTime(selectedDoctor.timing_end, '17:00'))
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const patientBookings = new Set(
      appointments
        .filter((appointment) => appointment.appt_date === appointmentDate && appointment.status !== 'cancelled')
        .map((appointment) => shortTime(appointment.appt_time, '')),
    )
    const slots: AppointmentSlot[] = []

    for (let minutes = start; minutes < end; minutes += APPOINTMENT_SLOT_MINUTES) {
      const slot = toTime(minutes)
      const isPastToday = appointmentDate === today && minutes <= currentMinutes
      slots.push({
        time: slot,
        state: isPastToday ? 'past' : patientBookings.has(slot) ? 'booked' : 'available',
      })
    }
    return slots
  }, [appointmentDate, appointments, selectedDoctor, today])
  const availableSlotCount = appointmentSlots.filter((slot) => slot.state === 'available').length

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!appointmentTime) {
      const message = 'Please select an available appointment time.'
      setError(message)
      showToast(message, 'error')
      return
    }

    const formData = new FormData(event.currentTarget)
    setError(null)
    startTransition(() => {
      void (async () => {
        const result = await bookAppointmentAction(formData)
        if (result?.error) {
          setError(result.error)
          showToast(result.error, 'error')
          return
        }
        showToast('Appointment booked successfully.', 'success')
        setAppointmentTime('')
        setReason('')
        router.refresh()
      })()
    })
  }

  const shiftStart = selectedDoctor ? shortTime(selectedDoctor.timing_start, '09:00') : ''
  const shiftEnd = selectedDoctor ? shortTime(selectedDoctor.timing_end, '17:00') : ''

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="patient_id" value={patientId} />
      <input type="hidden" name="appt_time" value={appointmentTime} />

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><Stethoscope className="h-4 w-4 text-teal-700" /> Doctor</span>
          <select name="doctor_id" required value={doctorId} onChange={(event) => { setDoctorId(event.target.value); setAppointmentTime(''); setError(null) }} className="hms-input">
            {doctors.length === 0 && <option value="">No active doctors available</option>}
            {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} ({doctor.specialization || 'General medicine'})</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200"><CalendarDays className="h-4 w-4 text-teal-700" /> Date</span>
          <input type="date" name="appt_date" required min={today} value={appointmentDate} onChange={(event) => { setAppointmentDate(event.target.value); setAppointmentTime(''); setError(null) }} className="hms-input" />
        </label>
      </div>

      {selectedDoctor && (
        <div className="flex items-center gap-3 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-teal-700 shadow-sm dark:bg-teal-950"><Clock3 className="h-4 w-4" /></span>
          <span><strong>{selectedDoctor.name}</strong> is available from {displayTime(shiftStart)} to {displayTime(shiftEnd)}. Appointments use 15-minute slots.</span>
        </div>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Appointment time</legend>
        {appointmentDate === today && (
          <p className="-mt-1 mb-2 text-xs text-slate-500 dark:text-slate-400">Past times remain visible but cannot be booked.</p>
        )}
        {appointmentSlots.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
              {appointmentSlots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={slot.state !== 'available'}
                  onClick={() => { setAppointmentTime(slot.time); setError(null) }}
                  aria-pressed={appointmentTime === slot.time}
                  className={`min-h-[3.65rem] rounded-xl border px-3 py-2 text-sm font-semibold transition ${appointmentTime === slot.time ? 'border-teal-700 bg-teal-700 text-white shadow-md shadow-teal-900/10' : slot.state === 'available' ? 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200' : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-500'}`}
                >
                  <span className="block">{displayTime(slot.time)}</span>
                  {slot.state !== 'available' && (
                    <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-wide">
                      {slot.state === 'past' ? 'Past' : 'Already booked'}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {availableSlotCount === 0 && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {appointmentDate === today ? 'No future slots remain today. Please choose another date.' : 'All slots conflict with an existing appointment. Please choose another date or doctor.'}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            This doctor does not have a valid appointment schedule configured.
          </div>
        )}
      </fieldset>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">Reason for visit</span>
        <textarea name="reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={255} rows={3} placeholder="Briefly describe your symptoms or reason for consultation" className="hms-input resize-none" />
        <span className="mt-1.5 block text-right text-xs text-slate-400">{reason.length}/255</span>
      </label>

      <SubmitButton disabled={isPending || !appointmentTime || doctors.length === 0}>{isPending ? 'Booking appointment…' : 'Book Appointment'}</SubmitButton>
    </form>
  )
}
