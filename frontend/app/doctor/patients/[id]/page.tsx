import {
  confirmAssignedAppointmentAction,
  startConsultationAction,
} from '@/app/actions/doctor'
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { PageHeader, StatusBadge, WorkflowStepper } from '@/components/ui/HmsUI'
import { APIError, fetchAPI } from '@/lib/api'
import {
  DoctorAppointment,
  DoctorPatientHistory,
  shortTime,
  statusLabel,
} from '@/lib/doctorTypes'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CircleCheck,
  ClipboardPlus,
  Stethoscope,
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const consultationSteps = ['Appointment confirmed', 'Consultation started', 'Prescription', 'Completed'] as const

function workflowStep(status: DoctorAppointment['status']) {
  if (status === 'requested') return 0
  if (status === 'confirmed') return 1
  if (status === 'checked_in') return 1
  if (status === 'in_progress') return 2
  return 3
}

function ConsultationWorkflow({
  appointment,
  patientId,
}: {
  appointment: DoctorAppointment | undefined
  patientId: number
}) {
  if (!appointment) {
    return (
      <section className="hms-card overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
              <CalendarClock aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">No active appointment</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                This patient does not currently have an active appointment assigned to you.
              </p>
            </div>
          </div>
          <Link href="/doctor/appointments" className="hms-button hms-button-secondary shrink-0">
            View schedule <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    )
  }

  const status = appointment.status
  const isRequested = status === 'requested'
  const isConfirmed = status === 'confirmed'
  const isCheckedIn = status === 'checked_in'
  const isInProgress = status === 'in_progress'

  const title = isInProgress
    ? 'Consultation in progress'
    : isCheckedIn
      ? 'Patient is ready for consultation'
      : isConfirmed
        ? 'Ready for consultation'
        : 'Appointment confirmation pending'

  const description = isInProgress
    ? 'Record the diagnosis, medicines, dosage, instructions, and clinical notes to complete this visit.'
    : isCheckedIn
      ? 'The patient has checked in. Start the consultation to unlock the prescription form.'
      : isConfirmed
        ? 'This appointment is assigned to you. Start the consultation to add clinical findings and a prescription.'
        : 'Confirm this assigned request to accept it. You can start the consultation immediately after confirmation.'

  return (
    <section className="hms-card overflow-hidden">
      <div className="border-b border-slate-200 p-6 dark:border-slate-800">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isInProgress || isCheckedIn || isConfirmed ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
              {isInProgress ? <ClipboardPlus aria-hidden="true" className="h-5 w-5" /> : isCheckedIn ? <Stethoscope aria-hidden="true" className="h-5 w-5" /> : <CalendarClock aria-hidden="true" className="h-5 w-5" />}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
                <StatusBadge status={statusLabel(status)} />
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                Appointment #{appointment.id} - {appointment.appt_date} at {shortTime(appointment.appt_time)}
              </p>
            </div>
          </div>

          {isInProgress && (
            <Link href={`/doctor/consultation?appointment_id=${appointment.id}`} className="hms-button hms-button-primary shrink-0">
              Continue and prescribe <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          )}
          {isCheckedIn && (
            <ClientForm action={startConsultationAction}>
              <input type="hidden" name="appointment_id" value={appointment.id} />
              <input type="hidden" name="patient_id" value={patientId} />
              <SubmitButton className="hms-button hms-button-primary shrink-0">
                Start consultation <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </SubmitButton>
            </ClientForm>
          )}
          {isRequested && (
            <ClientForm action={confirmAssignedAppointmentAction} successMessage="Appointment confirmed">
              <input type="hidden" name="appointment_id" value={appointment.id} />
              <input type="hidden" name="patient_id" value={patientId} />
              <SubmitButton className="hms-button hms-button-primary shrink-0">
                Confirm appointment <CircleCheck aria-hidden="true" className="h-4 w-4" />
              </SubmitButton>
            </ClientForm>
          )}
          {isConfirmed && (
            <ClientForm action={startConsultationAction}>
              <input type="hidden" name="appointment_id" value={appointment.id} />
              <input type="hidden" name="patient_id" value={patientId} />
              <SubmitButton className="hms-button hms-button-primary shrink-0">
                Start consultation <Stethoscope aria-hidden="true" className="h-4 w-4" />
              </SubmitButton>
            </ClientForm>
          )}
        </div>
      </div>
      <div className="bg-slate-50/70 p-4 dark:bg-slate-950/40 sm:p-6">
        <WorkflowStepper steps={consultationSteps} current={workflowStep(status)} />
      </div>
    </section>
  )
}

export default async function PatientHistory({ params }: { params: { id: string } }) {
  if (!/^\d+$/.test(params.id)) notFound()

  let history: DoctorPatientHistory
  let ownAppointments: DoctorAppointment[]
  try {
    ;[history, ownAppointments] = await Promise.all([
      fetchAPI(`/patients/${params.id}/history`) as Promise<DoctorPatientHistory>,
      fetchAPI('/appointments/?doctor_id=me') as Promise<DoctorAppointment[]>,
    ])
  } catch (error) {
    if (error instanceof APIError && error.status === 404) notFound()
    if (error instanceof APIError && error.status === 403) {
      return (
        <div className="hms-card border-amber-200 bg-amber-50 p-8 dark:border-amber-900 dark:bg-amber-950/40">
          <h1 className="text-xl font-semibold text-amber-900 dark:text-amber-200">You are not authorized to access this resource.</h1>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">This patient is not associated with your assigned appointments.</p>
          <Link href="/doctor/patients" className="mt-5 inline-flex font-semibold text-amber-900 underline dark:text-amber-200">Return to my patients</Link>
        </div>
      )
    }
    throw error
  }

  const { patient } = history
  const appointmentMap = new Map(history.appointments.map((appointment) => [appointment.id, appointment]))
  const assignedAppointments = ownAppointments.filter((appointment) => appointment.patient_id === patient.id)
  const workflowAppointment = ['in_progress', 'checked_in', 'confirmed', 'requested']
    .map((status) => assignedAppointments.find((appointment) => appointment.status === status))
    .find((appointment): appointment is DoctorAppointment => Boolean(appointment))
  const assignedAppointmentIds = new Set(assignedAppointments.map((appointment) => appointment.id))

  return (
    <div className="space-y-6">
      <Link href="/doctor/patients" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 transition hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Back to my patients
      </Link>

      <PageHeader
        eyebrow="Patient record"
        title={patient.name}
        description={`Patient #${patient.id} - Clinical history and consultation workflow`}
      />

      <ConsultationWorkflow appointment={workflowAppointment} patientId={patient.id} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Patient ID', `#${patient.id}`],
          ['Age', patient.age === null ? 'Not recorded' : `${patient.age} years`],
          ['Gender', patient.gender || 'Not recorded'],
          ['Blood group', patient.blood_group || 'Not recorded'],
          ['Contact', patient.contact || 'Not provided'],
        ].map(([label, value]) => (
          <div key={label} className="hms-card p-4">
            <p className="hms-eyebrow">{label}</p>
            <p className="mt-2 font-semibold capitalize text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      <section className="hms-card overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Appointment history</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Past and upcoming visits for this patient.</p>
        </div>
        {history.appointments.length === 0 ? (
          <p className="p-6 text-slate-500 dark:text-slate-400">No appointment history found.</p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {history.appointments.map((appointment) => (
              <div key={appointment.id} className="flex flex-col justify-between gap-3 px-6 py-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-950 dark:text-white">Appointment #{appointment.id} - {appointment.appt_date} at {shortTime(appointment.appt_time)}</p>
                    {assignedAppointmentIds.has(appointment.id) && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        <CircleCheck aria-hidden="true" className="h-3 w-3" /> Assigned to you
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{appointment.reason || 'No reason recorded'}</p>
                </div>
                <StatusBadge status={statusLabel(appointment.status)} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="hms-card p-6">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Prescriptions and diagnoses</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Completed clinical records remain available for review.</p>
        {history.prescriptions.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">No prescription history found.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {history.prescriptions.map((prescription) => {
              const appointment = appointmentMap.get(prescription.appointment_id)
              return (
                <div key={prescription.id} className="rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Prescription #{prescription.id} - {appointment ? `${appointment.appt_date} at ${shortTime(appointment.appt_time)}` : new Date(prescription.created_at).toLocaleDateString()}
                  </p>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="font-semibold text-slate-700 dark:text-slate-300">Diagnosis</dt><dd className="mt-1 text-slate-950 dark:text-white">{prescription.diagnosis || 'Not recorded'}</dd></div>
                    <div><dt className="font-semibold text-slate-700 dark:text-slate-300">Medicines</dt><dd className="mt-1 text-slate-950 dark:text-white">{prescription.medicine || 'Not recorded'}</dd></div>
                    <div><dt className="font-semibold text-slate-700 dark:text-slate-300">Dosage</dt><dd className="mt-1 text-slate-950 dark:text-white">{prescription.dosage || 'Not recorded'}</dd></div>
                    <div><dt className="font-semibold text-slate-700 dark:text-slate-300">Instructions / notes</dt><dd className="mt-1 whitespace-pre-line text-slate-950 dark:text-white">{prescription.notes || 'Not recorded'}</dd></div>
                  </dl>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
