import Link from 'next/link'
import { notFound } from 'next/navigation'

import { APIError, fetchAPI } from '@/lib/api'
import type { NursePatientDetail } from '@/lib/nurseTypes'
import { priorityClass, shortTime, statusClass, statusLabel } from '@/lib/nurseTypes'

import NursingNoteForm from './NursingNoteForm'

export default async function NursePatientRecord({ params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) notFound()
  let record: NursePatientDetail
  try {
    record = await fetchAPI(`/nurse/patients/${params.id}`) as NursePatientDetail
  } catch (error) {
    if (error instanceof APIError && error.status === 404) notFound()
    if (error instanceof APIError && error.status === 403) {
      return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8"><h1 className="text-xl font-semibold text-amber-900">Patient assignment required</h1><p className="mt-2 text-sm text-amber-800">This patient has no active nursing task assigned to you.</p><Link href="/nurse/patients" className="mt-5 inline-flex font-semibold text-amber-900 underline">Return to assigned patients</Link></div>
    }
    throw error
  }
  const patient = record.patient
  return (
    <div className="space-y-6">
      <div><Link href="/nurse/patients" className="text-sm font-semibold text-blue-700">&larr; Back to patients</Link><p className="mt-5 text-sm font-semibold uppercase tracking-wider text-blue-600">Nursing care record</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{patient.name}</h1><p className="mt-1 text-slate-600">Patient #{patient.id} · Relevant clinical information is read-only.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[
        ['Patient ID', `#${patient.id}`], ['Age', patient.age === null ? 'Not recorded' : `${patient.age} years`], ['Gender', patient.gender || 'Not recorded'], ['Blood group', patient.blood_group || 'Not recorded'], ['Contact', patient.contact || 'Not provided'],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 font-medium capitalize text-slate-900">{value}</p></div>)}</div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-900">Assigned nursing tasks</h2>{record.tasks.length === 0 ? <p className="mt-4 text-slate-500">No task history found.</p> : <div className="mt-4 space-y-3">{record.tasks.map((task) => <div key={task.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><p className="font-semibold text-slate-900">{task.task_type}</p><div className="flex gap-1"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${priorityClass(task.priority)}`}>{task.priority}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(task.status)}`}>{statusLabel(task.status)}</span></div></div><p className="mt-2 text-sm text-slate-700">{task.description}</p></div>)}</div>}</section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-900">Add nursing observation</h2><p className="mt-1 text-sm text-slate-500">Append-only nursing notes; diagnosis and prescription fields cannot be changed.</p><NursingNoteForm patientId={patient.id} appointments={record.appointments} /></section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-900">Vitals history</h2></div>{record.vitals.length === 0 ? <p className="p-6 text-slate-500">No vitals recorded.</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500"><tr><th className="px-5 py-4">Recorded</th><th className="px-5 py-4">Temp</th><th className="px-5 py-4">BP</th><th className="px-5 py-4">HR / RR / SpO₂</th><th className="px-5 py-4">Notes</th></tr></thead><tbody className="divide-y">{record.vitals.map((vital) => <tr key={vital.id}><td className="px-5 py-4"><p>{new Date(vital.recorded_at).toLocaleString()}</p><p className="text-xs text-slate-500">{vital.recorded_by_name}</p></td><td className="px-5 py-4">{vital.temperature ?? '—'}</td><td className="px-5 py-4">{vital.blood_pressure_systolic && vital.blood_pressure_diastolic ? `${vital.blood_pressure_systolic}/${vital.blood_pressure_diastolic}` : '—'}</td><td className="px-5 py-4">{vital.pulse ?? '—'} / {vital.respiratory_rate ?? '—'} / {vital.oxygen_saturation ?? '—'}</td><td className="max-w-sm px-5 py-4 text-slate-600">{vital.notes || '—'}</td></tr>)}</tbody></table></div>}</section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-900">Nursing observations</h2>{record.nursing_notes.length === 0 ? <p className="mt-4 text-slate-500">No observations recorded.</p> : <div className="mt-4 space-y-3">{record.nursing_notes.map((note) => <div key={note.id} className="rounded-xl bg-slate-50 p-4"><p className="whitespace-pre-line text-sm text-slate-800">{note.note}</p><p className="mt-2 text-xs text-slate-500">{note.nurse_name} · {new Date(note.created_at).toLocaleString()}</p></div>)}</div>}</section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-semibold text-slate-900">Appointment history</h2></div>{record.appointments.length === 0 ? <p className="p-6 text-slate-500">No appointments found.</p> : <div className="divide-y">{record.appointments.map((appointment) => <div key={appointment.id} className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center"><div><p className="font-medium text-slate-900">#{appointment.id} · {appointment.appt_date} at {shortTime(appointment.appt_time)} · Dr. {appointment.doctor_name}</p><p className="mt-1 text-sm text-slate-500">{appointment.reason || 'No reason recorded'}</p></div><span className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>{statusLabel(appointment.status)}</span></div>)}</div>}</section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold text-slate-900">Prescriptions and diagnosis</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Read-only</span></div>{record.prescriptions.length === 0 ? <p className="mt-4 text-slate-500">No prescription records found.</p> : <div className="mt-4 space-y-4">{record.prescriptions.map((prescription) => <div key={prescription.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs text-slate-500">Prescription #{prescription.id} · {new Date(prescription.created_at).toLocaleDateString()}</p><dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-semibold text-slate-700">Diagnosis</dt><dd className="mt-1 text-slate-900">{prescription.diagnosis || 'Not recorded'}</dd></div><div><dt className="font-semibold text-slate-700">Medicine</dt><dd className="mt-1 text-slate-900">{prescription.medicine || 'Not recorded'}</dd></div><div><dt className="font-semibold text-slate-700">Dosage</dt><dd className="mt-1 text-slate-900">{prescription.dosage || 'Not recorded'}</dd></div><div><dt className="font-semibold text-slate-700">Doctor instructions</dt><dd className="mt-1 whitespace-pre-line text-slate-900">{prescription.notes || 'Not recorded'}</dd></div></dl></div>)}</div>}</section>
    </div>
  )
}
