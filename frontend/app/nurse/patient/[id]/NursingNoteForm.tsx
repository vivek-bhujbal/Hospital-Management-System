'use client'

import { useRef, useState } from 'react'

import { addNursingNoteAction } from '@/app/actions/nurse'
import SubmitButton from '@/components/SubmitButton'

export default function NursingNoteForm({ patientId, appointments }: { patientId: number; appointments: Array<{ id: number; appt_date: string }> }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await addNursingNoteAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    formRef.current?.reset()
    setSuccess('Nursing observation added.')
  }

  return (
    <form ref={formRef} action={submit} className="mt-4 space-y-3">
      <input type="hidden" name="patient_id" value={patientId} />
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {success && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
      <select name="appointment_id" className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"><option value="">General nursing observation</option>{appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>Appointment #{appointment.id} · {appointment.appt_date}</option>)}</select>
      <textarea name="note" required maxLength={4000} rows={4} className="w-full rounded-xl border border-slate-300 p-3 text-sm" placeholder="Record nursing observation only. Do not alter diagnosis or prescription." />
      <SubmitButton className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add observation</SubmitButton>
    </form>
  )
}
