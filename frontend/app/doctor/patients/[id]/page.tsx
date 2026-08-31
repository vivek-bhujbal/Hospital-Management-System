import { APIError, fetchAPI } from '@/lib/api'
import {
  DoctorPatientHistory,
  shortTime,
  statusClass,
  statusLabel,
} from '@/lib/doctorTypes'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function PatientHistory({ params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) notFound()
  let history: DoctorPatientHistory
  try {
    history = await fetchAPI(`/patients/${params.id}/history`) as DoctorPatientHistory
  } catch (error) {
    if (error instanceof APIError && error.status === 404) notFound()
    if (error instanceof APIError && error.status === 403) {
      return (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
          <h1 className="text-xl font-semibold text-amber-900">You are not authorized to access this resource.</h1>
          <p className="mt-2 text-sm text-amber-800">This patient is not associated with your assigned appointments.</p>
          <Link href="/doctor/patients" className="mt-5 inline-flex font-semibold text-amber-900 underline">Return to my patients</Link>
        </div>
      )
    }
    throw error
  }
  const { patient } = history
  const appointments = new Map(history.appointments.map((appointment) => [appointment.id, appointment]))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/doctor/patients" className="text-sm font-semibold text-blue-700 hover:text-blue-800">&larr; Back to my patients</Link>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-blue-600">Patient record</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{patient.name}</h1>
        <p className="mt-1 text-slate-600">Patient #{patient.id} · Read-only clinical and appointment history</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Patient ID', `#${patient.id}`],
          ['Age', patient.age === null ? 'Not recorded' : `${patient.age} years`],
          ['Gender', patient.gender || 'Not recorded'],
          ['Blood group', patient.blood_group || 'Not recorded'],
          ['Contact', patient.contact || 'Not provided'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 font-medium capitalize text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Previous appointments</h2>
        </div>
        {history.appointments.length === 0 ? (
          <p className="p-6 text-slate-500">No appointment history found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.appointments.map((appointment) => (
              <div key={appointment.id} className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center">
                <div>
                  <p className="font-medium text-slate-900">Appointment #{appointment.id} · {appointment.appt_date} at {shortTime(appointment.appt_time)}</p>
                  <p className="mt-1 text-sm text-slate-500">{appointment.reason || 'No reason recorded'}</p>
                </div>
                <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>
                  {statusLabel(appointment.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Prescriptions and diagnoses</h2>
        {history.prescriptions.length === 0 ? (
          <p className="mt-4 text-slate-500">No prescription history found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {history.prescriptions.map((prescription) => {
              const appointment = appointments.get(prescription.appointment_id)
              return (
              <div key={prescription.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">
                  Prescription #{prescription.id} · {appointment ? `${appointment.appt_date} at ${shortTime(appointment.appt_time)}` : new Date(prescription.created_at).toLocaleDateString()}
                </p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="font-semibold text-slate-700">Diagnosis</dt><dd className="mt-1 text-slate-900">{prescription.diagnosis || 'Not recorded'}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Medicines</dt><dd className="mt-1 text-slate-900">{prescription.medicine || 'Not recorded'}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Dosage</dt><dd className="mt-1 text-slate-900">{prescription.dosage || 'Not recorded'}</dd></div>
                  <div><dt className="font-semibold text-slate-700">Instructions / notes</dt><dd className="mt-1 whitespace-pre-line text-slate-900">{prescription.notes || 'Not recorded'}</dd></div>
                </dl>
              </div>
            )})}
          </div>
        )}
      </section>
    </div>
  )
}
