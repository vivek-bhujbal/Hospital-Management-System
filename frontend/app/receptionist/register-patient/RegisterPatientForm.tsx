'use client'

import Link from 'next/link'
import { FormEvent, useRef, useState, useTransition } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

import { registerPatientAction } from '@/app/actions/receptionist'

interface RegisteredPatient {
  id: number
  name: string
}

export default function RegisterPatientForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [patient, setPatient] = useState<RegisteredPatient | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setError(null)
    setPatient(null)
    startTransition(() => {
      void (async () => {
        const result = await registerPatientAction(formData)
        if (result.error || !result.data) {
          setError(result.error || 'Patient registration failed')
          return
        }
        setPatient(result.data)
        formRef.current?.reset()
      })()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Walk-in registration</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Register Patient</h1>
        <p className="mt-1 text-slate-600">Create a front-desk patient record. An appointment is not created automatically.</p>
      </div>

      {patient && (
        <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between" role="status">
          <div className="flex gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">Patient registered successfully</p>
              <p className="mt-1 text-sm text-emerald-800">{patient.name} · Patient ID #{patient.id}</p>
            </div>
          </div>
          <Link href={`/receptionist/schedule?patient_id=${patient.id}`} className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800">
            Schedule Appointment <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</div>}

      <form ref={formRef} onSubmit={handleSubmit} className="max-w-3xl space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <label htmlFor="patient-name" className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
          <input id="patient-name" name="name" required maxLength={100} autoComplete="name" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="patient-age" className="mb-2 block text-sm font-medium text-slate-700">Age</label>
            <input id="patient-age" type="number" name="age" min={0} max={130} required className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label htmlFor="patient-gender" className="mb-2 block text-sm font-medium text-slate-700">Gender</label>
            <select id="patient-gender" name="gender" required defaultValue="" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="" disabled>Select gender</option>
              <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="patient-contact" className="mb-2 block text-sm font-medium text-slate-700">Phone/contact</label>
            <input id="patient-contact" name="contact" required maxLength={20} autoComplete="tel" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label htmlFor="patient-blood" className="mb-2 block text-sm font-medium text-slate-700">Blood group</label>
            <select id="patient-blood" name="blood_group" defaultValue="" className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">Not known</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => <option key={group}>{group}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="patient-address" className="mb-2 block text-sm font-medium text-slate-700">Address</label>
          <textarea id="patient-address" name="address" rows={3} maxLength={1000} className="w-full resize-none rounded-lg border border-slate-300 bg-slate-50 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-5">
          <button disabled={isPending} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
            {isPending ? 'Registering…' : 'Register Patient'}
          </button>
        </div>
      </form>
    </div>
  )
}
