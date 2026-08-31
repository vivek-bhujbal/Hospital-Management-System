import Link from 'next/link'

import { completeConsultationAction, startConsultationAction } from '@/app/actions/doctor'
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import {
  DoctorAppointment,
  DoctorPatient,
  DoctorPatientHistory,
  shortTime,
  statusClass,
  statusLabel,
} from '@/lib/doctorTypes'

function PatientSummary({ patient }: { patient: DoctorPatient | undefined }) {
  if (!patient) return <p className="text-sm text-amber-700">Patient information is unavailable.</p>
  return (
    <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {[
        ['Patient', patient.name],
        ['Patient ID', `#${patient.id}`],
        ['Age', patient.age === null ? 'Not recorded' : `${patient.age} years`],
        ['Gender', patient.gender || 'Not recorded'],
        ['Blood group', patient.blood_group || 'Not recorded'],
      ].map(([label, value]) => (
        <div key={label} className="rounded-xl bg-slate-50 p-4">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="mt-2 font-medium capitalize text-slate-900">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default async function DoctorConsultation({ searchParams }: { searchParams: { appointment_id?: string } }) {
  const [appointments, patients] = await Promise.all([
    fetchAPI('/appointments/?doctor_id=me') as Promise<DoctorAppointment[]>,
    fetchAPI('/patients/') as Promise<DoctorPatient[]>,
  ])
  const patientMap = new Map(patients.map((patient) => [patient.id, patient]))
  const appointmentId = searchParams.appointment_id

  if (!appointmentId) {
    const consultable = appointments.filter((appointment) =>
      ['checked_in', 'in_progress'].includes(appointment.status),
    )
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Clinical workflow</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Consultation</h1>
          <p className="mt-1 text-slate-600">Select a checked-in patient or continue an active consultation.</p>
        </div>
        {consultable.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <p className="font-medium text-slate-800">No patients are ready for consultation</p>
            <p className="mt-1 text-sm text-slate-500">A receptionist must check in the patient before you can start.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {consultable.map((appointment) => (
                <div key={appointment.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-semibold text-slate-900">{patientMap.get(appointment.patient_id)?.name || `Patient #${appointment.patient_id}`}</p>
                    <p className="mt-1 text-sm text-slate-500">Appointment #{appointment.id} · {appointment.appt_date} at {shortTime(appointment.appt_time)}</p>
                    <p className="mt-1 text-sm text-slate-600">{appointment.reason || 'No reason recorded'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>
                      {statusLabel(appointment.status)}
                    </span>
                    {appointment.status === 'checked_in' ? (
                      <ClientForm action={startConsultationAction}>
                        <input type="hidden" name="appointment_id" value={appointment.id} />
                        <SubmitButton className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                          Start consultation
                        </SubmitButton>
                      </ClientForm>
                    ) : (
                      <Link href={`/doctor/consultation?appointment_id=${appointment.id}`} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                        Continue consultation
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!/^\d+$/.test(appointmentId)) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-xl font-semibold text-amber-900">Appointment not found.</h1>
        <Link href="/doctor/consultation" className="mt-4 inline-flex font-semibold text-amber-900 underline">Choose another appointment</Link>
      </div>
    )
  }

  const appointment = appointments.find((item) => item.id === Number(appointmentId))
  if (!appointment) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <h1 className="text-xl font-semibold text-amber-900">You are not authorized to access this resource.</h1>
        <p className="mt-2 text-sm text-amber-800">The appointment was not found or is not assigned to you.</p>
        <Link href="/doctor/consultation" className="mt-4 inline-flex font-semibold text-amber-900 underline">Return to consultation queue</Link>
      </div>
    )
  }

  const patient = patientMap.get(appointment.patient_id)
  const history = await fetchAPI(`/patients/${appointment.patient_id}/history`) as DoctorPatientHistory
  const canStart = appointment.status === 'checked_in'
  const canComplete = appointment.status === 'in_progress'

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Link href="/doctor/consultation" className="text-sm font-semibold text-blue-700 hover:text-blue-800">&larr; Consultation queue</Link>
          <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-blue-600">Active consultation</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Appointment #{appointment.id}</h1>
        </div>
        <span className={`inline-flex w-fit rounded-full px-3 py-1.5 text-sm font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>
          {statusLabel(appointment.status)}
        </span>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Patient information</h2>
        <div className="mt-4"><PatientSummary patient={patient} /></div>
        {patient && <Link href={`/doctor/patients/${patient.id}`} className="mt-4 inline-flex text-sm font-semibold text-blue-700 hover:text-blue-800">View full history &rarr;</Link>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Appointment information</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-sm font-medium text-slate-500">Appointment ID</dt><dd className="mt-1 font-semibold text-slate-900">#{appointment.id}</dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Date</dt><dd className="mt-1 font-semibold text-slate-900">{appointment.appt_date}</dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Time</dt><dd className="mt-1 font-semibold text-slate-900">{shortTime(appointment.appt_time)}</dd></div>
          <div><dt className="text-sm font-medium text-slate-500">Reason</dt><dd className="mt-1 font-semibold text-slate-900">{appointment.reason || 'Not recorded'}</dd></div>
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Relevant history</h2>
        {history.prescriptions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No previous prescriptions are available.</p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {history.prescriptions.slice(0, 4).map((prescription) => (
              <div key={prescription.id} className="rounded-xl bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-900">{prescription.diagnosis || 'Diagnosis not recorded'}</p>
                <p className="mt-1 text-slate-600">{prescription.medicine || 'Medicine not recorded'} · {prescription.dosage || 'Dosage not recorded'}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {canStart && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="text-lg font-semibold text-emerald-900">Patient is checked in and ready</h2>
          <p className="mt-1 text-sm text-emerald-800">Start the consultation before entering clinical findings.</p>
          <ClientForm action={startConsultationAction} className="mt-4">
            <input type="hidden" name="appointment_id" value={appointment.id} />
            <SubmitButton className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-700">
              Start consultation
            </SubmitButton>
          </ClientForm>
        </section>
      )}

      {canComplete && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Clinical findings and prescription</h2>
          <p className="mt-1 text-sm text-slate-500">Completing this form creates one prescription, completes the appointment, and generates one pending bill.</p>
          <ClientForm action={completeConsultationAction} className="mt-6 space-y-5">
            <input type="hidden" name="appointment_id" value={appointment.id} />
            <div>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="diagnosis">Diagnosis</label>
              <textarea id="diagnosis" name="diagnosis" required rows={3} className="mt-2 block w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="medicine">Medicines</label>
              <input id="medicine" name="medicine" required placeholder="Enter one or more medicines" className="mt-2 block w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="dosage">Dosage</label>
              <input id="dosage" name="dosage" required placeholder="Example: one tablet twice daily" className="mt-2 block w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="instructions">Instructions</label>
              <textarea id="instructions" name="instructions" rows={2} placeholder="Medication and follow-up instructions" className="mt-2 block w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700" htmlFor="clinical_notes">Clinical notes</label>
              <textarea id="clinical_notes" name="clinical_notes" rows={3} placeholder="Relevant examination findings and notes" className="mt-2 block w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            </div>
            <SubmitButton className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700">
              Create prescription and complete
            </SubmitButton>
          </ClientForm>
        </section>
      )}

      {!canStart && !canComplete && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          {appointment.status === 'completed'
            ? 'This consultation is complete and its historical record is read-only.'
            : 'This appointment is not ready for consultation. The patient must be checked in first.'}
        </div>
      )}
    </div>
  )
}
