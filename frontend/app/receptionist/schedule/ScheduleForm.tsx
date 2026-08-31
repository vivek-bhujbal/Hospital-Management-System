'use client'

import Link from 'next/link'
import { FormEvent, useMemo, useState, useTransition } from 'react'
import { CheckCircle2, Search } from 'lucide-react'

import { bookAppointmentAction } from '@/app/actions/receptionist'
import {
  dateValue,
  ReceptionAppointment,
  ReceptionDoctor,
  ReceptionPatient,
  shortTime,
} from '@/lib/receptionistTypes'

interface ScheduleFormProps {
  patients: ReceptionPatient[]
  doctors: ReceptionDoctor[]
  appointments: ReceptionAppointment[]
  initialPatientId: number | null
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function toTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export default function ScheduleForm({ patients, doctors, appointments, initialPatientId }: ScheduleFormProps) {
  const [patientQuery, setPatientQuery] = useState('')
  const [patientId, setPatientId] = useState(initialPatientId ? String(initialPatientId) : '')
  const [doctorId, setDoctorId] = useState('')
  const [appointmentDate, setAppointmentDate] = useState(dateValue())
  const [appointmentTime, setAppointmentTime] = useState('')
  const [confirmationId, setConfirmationId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const matchingPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase()
    if (!query) return patients
    return patients.filter((patient) => patient.name.toLowerCase().includes(query)
      || (patient.contact || '').toLowerCase().includes(query)
      || String(patient.id).includes(query.replace(/^#/, '')))
  }, [patientQuery, patients])

  const selectedDoctor = doctors.find((doctor) => String(doctor.id) === doctorId)
  const availableSlots = useMemo(() => {
    if (!selectedDoctor || !appointmentDate) return []
    const start = toMinutes(shortTime(selectedDoctor.timing_start || '09:00'))
    const end = toMinutes(shortTime(selectedDoctor.timing_end || '17:00'))
    const occupied = new Set(appointments
      .filter((appointment) => appointment.doctor_id === selectedDoctor.id
        && appointment.appt_date === appointmentDate
        && appointment.status !== 'cancelled')
      .map((appointment) => shortTime(appointment.appt_time)))
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const slots: string[] = []
    for (let minutes = start; minutes < end; minutes += 30) {
      const value = toTime(minutes)
      const isPastToday = appointmentDate === dateValue() && minutes <= currentMinutes
      if (!occupied.has(value) && !isPastToday) slots.push(value)
    }
    return slots
  }, [appointmentDate, appointments, selectedDoctor])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError(null)
    setConfirmationId(null)
    startTransition(() => {
      void (async () => {
        const result = await bookAppointmentAction(formData)
        if (result.error || !result.data) {
          setError(result.error || 'Appointment could not be scheduled')
          return
        }
        setConfirmationId(result.data.id)
        setAppointmentTime('')
      })()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Appointment desk</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Schedule Appointment</h1>
        <p className="mt-1 text-slate-600">Select an existing patient, active doctor, date, and an available time slot.</p>
      </div>

      {confirmationId && (
        <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between" role="status">
          <div className="flex items-center gap-3 text-emerald-900"><CheckCircle2 className="h-6 w-6" /><strong>Appointment #{confirmationId} scheduled as requested.</strong></div>
          <Link href="/receptionist/queue" className="rounded-lg bg-emerald-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-800">View Today&apos;s Queue</Link>
        </div>
      )}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <label htmlFor="patient-search" className="mb-2 block text-sm font-medium text-slate-700">Search patient</label>
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input id="patient-search" value={patientQuery} onChange={(event) => setPatientQuery(event.target.value)} placeholder="Name, phone, or patient ID" className="w-full rounded-lg border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <select name="patient_id" required value={patientId} onChange={(event) => setPatientId(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="" disabled>Select patient</option>
            {matchingPatients.map((patient) => <option key={patient.id} value={patient.id}>#{patient.id} · {patient.name} · {patient.contact || 'No contact'}</option>)}
          </select>
          {matchingPatients.length === 0 && <p className="mt-2 text-sm text-amber-700">No patient matches this search.</p>}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="appointment-doctor" className="mb-2 block text-sm font-medium text-slate-700">Active doctor</label>
            <select id="appointment-doctor" name="doctor_id" required value={doctorId} onChange={(event) => { setDoctorId(event.target.value); setAppointmentTime('') }} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="" disabled>Select doctor</option>
              {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>Dr {doctor.name}{doctor.specialization ? ` · ${doctor.specialization}` : ''}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="appointment-date" className="mb-2 block text-sm font-medium text-slate-700">Appointment date</label>
            <input id="appointment-date" type="date" name="appt_date" required min={dateValue()} value={appointmentDate} onChange={(event) => { setAppointmentDate(event.target.value); setAppointmentTime('') }} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>

        <div>
          <label htmlFor="appointment-time" className="mb-2 block text-sm font-medium text-slate-700">Available time</label>
          <select id="appointment-time" name="appt_time" required disabled={!selectedDoctor || availableSlots.length === 0} value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="" disabled>{selectedDoctor ? (availableSlots.length ? 'Select available slot' : 'No slots available') : 'Select a doctor first'}</option>
            {availableSlots.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="appointment-reason" className="mb-2 block text-sm font-medium text-slate-700">Reason (optional)</label>
          <textarea id="appointment-reason" name="reason" maxLength={255} rows={3} className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button disabled={isPending || !appointmentTime} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? 'Scheduling…' : 'Schedule Appointment'}</button>
        </div>
      </form>
    </div>
  )
}
