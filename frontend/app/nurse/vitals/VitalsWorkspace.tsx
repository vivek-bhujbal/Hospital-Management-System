'use client'

import { useMemo, useRef, useState } from 'react'

import { recordVitalsAction } from '@/app/actions/nurse'
import SubmitButton from '@/components/SubmitButton'
import type { NurseAppointment, NursePatient, NurseVital } from '@/lib/nurseTypes'

interface Props {
  patients: NursePatient[]
  appointments: NurseAppointment[]
  vitals: NurseVital[]
}

const MEASUREMENTS = [
  ['temperature', 'Temperature (°C)', 'number', '0.1'],
  ['blood_pressure_systolic', 'BP systolic', 'number', '1'],
  ['blood_pressure_diastolic', 'BP diastolic', 'number', '1'],
  ['pulse', 'Heart rate / pulse', 'number', '1'],
  ['respiratory_rate', 'Respiratory rate', 'number', '1'],
  ['oxygen_saturation', 'Oxygen saturation (%)', 'number', '0.1'],
  ['weight', 'Weight (kg)', 'number', '0.1'],
  ['height', 'Height (cm)', 'number', '0.1'],
] as const

export default function VitalsWorkspace({ patients, appointments, vitals }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const [patientId, setPatientId] = useState(patients[0] ? String(patients[0].id) : '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const patientAppointments = useMemo(
    () => appointments.filter((appointment) => String(appointment.patient_id) === patientId),
    [appointments, patientId],
  )

  async function submit(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await recordVitalsAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    formRef.current?.reset()
    setPatientId(patientId)
    setSuccess('Vitals recorded. Historical records remain append-only.')
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Clinical observations</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Vitals</h1>
        <p className="mt-1 text-slate-600">Record a new timestamped observation for an assigned patient.</p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Existing vital records cannot be edited or deleted. Corrections must be added as a new observation for a complete audit history.
        </div>
        {patients.length === 0 ? <p className="mt-5 text-slate-500">No active patient assignment is available for vital recording.</p> : (
          <form ref={formRef} action={submit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {error && <p className="md:col-span-2 xl:col-span-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            {success && <p className="md:col-span-2 xl:col-span-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
            <label className="md:col-span-1 xl:col-span-2 text-sm font-medium text-slate-700">Patient
              <select name="patient_id" required value={patientId} onChange={(event) => setPatientId(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3">
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name} (#{patient.id})</option>)}
              </select>
            </label>
            <label className="md:col-span-1 xl:col-span-2 text-sm font-medium text-slate-700">Related appointment (optional)
              <select name="appointment_id" className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3">
                <option value="">General observation</option>
                {patientAppointments.map((appointment) => <option key={appointment.id} value={appointment.id}>#{appointment.id} · {appointment.appt_date} · {appointment.status.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            {MEASUREMENTS.map(([name, label, type, step]) => (
              <label key={name} className="text-sm font-medium text-slate-700">{label}
                <input name={name} type={type} step={step} className="mt-1 w-full rounded-xl border border-slate-300 p-3" />
              </label>
            ))}
            <label className="md:col-span-2 xl:col-span-4 text-sm font-medium text-slate-700">Other observations
              <textarea name="notes" maxLength={4000} rows={3} className="mt-1 w-full rounded-xl border border-slate-300 p-3" placeholder="Pain score, consciousness, mobility, intake/output, or other relevant observation" />
            </label>
            <p className="md:col-span-1 xl:col-span-3 text-xs text-slate-500">At least one measurement or observation is required. Nurse identity and timestamp are recorded automatically.</p>
            <SubmitButton className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700">Record vitals</SubmitButton>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-900">Observation history</h2></div>
        {vitals.length === 0 ? <p className="p-8 text-center text-slate-500">No vitals recorded for your assigned patients.</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-4">Patient / time</th><th className="px-5 py-4">Temperature</th><th className="px-5 py-4">Blood pressure</th><th className="px-5 py-4">HR / RR / SpO₂</th><th className="px-5 py-4">Weight / height</th><th className="px-5 py-4">Notes</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {vitals.map((vital) => (
                  <tr key={vital.id}>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900">{vital.patient_name}</p><p className="mt-1 text-xs text-slate-500">{new Date(vital.recorded_at).toLocaleString()} · {vital.recorded_by_name}</p></td>
                    <td className="px-5 py-4">{vital.temperature ?? '—'}{vital.temperature !== null ? ' °C' : ''}</td>
                    <td className="px-5 py-4">{vital.blood_pressure_systolic && vital.blood_pressure_diastolic ? `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}` : '—'}</td>
                    <td className="px-5 py-4">{vital.pulse ?? '—'} / {vital.respiratory_rate ?? '—'} / {vital.oxygen_saturation ?? '—'}</td>
                    <td className="px-5 py-4">{vital.weight ?? '—'} kg / {vital.height ?? '—'} cm</td>
                    <td className="max-w-sm px-5 py-4 text-slate-600">{vital.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
