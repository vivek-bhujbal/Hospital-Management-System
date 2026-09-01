import AutoRefresh from '@/components/AutoRefresh'
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import {
  DoctorAppointment,
  DoctorPatient,
  DoctorProfile,
  localDateValue,
  shortTime,
  statusClass,
  statusLabel,
} from '@/lib/doctorTypes'
import Link from 'next/link'
import { startConsultationAction } from '@/app/actions/doctor'

export default async function DoctorHome() {
  const today = localDateValue()
  const [profile, appointments, patients] = await Promise.all([
    fetchAPI('/doctors/me') as Promise<DoctorProfile>,
    fetchAPI('/appointments/?doctor_id=me') as Promise<DoctorAppointment[]>,
    fetchAPI('/patients/') as Promise<DoctorPatient[]>,
  ])
  const patientNames = new Map(patients.map((patient) => [patient.id, patient.name]))
  const assignedAppointments = appointments.filter((appointment) => appointment.status !== 'cancelled')
  const todayAppointments = assignedAppointments.filter((appointment) => appointment.appt_date === today)
  const nowTime = new Date().toTimeString().slice(0, 5)
  const upcoming = assignedAppointments.find((appointment) =>
    appointment.status !== 'completed'
      && (appointment.appt_date > today
        || (appointment.appt_date === today && shortTime(appointment.appt_time) >= nowTime)),
  )
  const metrics = [
    ['Assigned total', assignedAppointments.length, 'text-slate-900'],
    ['Waiting', assignedAppointments.filter((item) => ['requested', 'confirmed'].includes(item.status)).length, 'text-amber-600'],
    ['Checked in', assignedAppointments.filter((item) => item.status === 'checked_in').length, 'text-violet-600'],
    ['In progress', assignedAppointments.filter((item) => item.status === 'in_progress').length, 'text-cyan-600'],
    ['Completed', assignedAppointments.filter((item) => item.status === 'completed').length, 'text-emerald-600'],
  ] as const

  return (
    <div className="space-y-6">
      <AutoRefresh interval={30000} />
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Clinical dashboard</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Welcome, Dr. {profile.name}</h1>
          <p className="mt-1 text-slate-600">Assigned workload snapshot · {today}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/doctor/appointments" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            View all appointments
          </Link>
          {assignedAppointments[0] && (
            <Link href={`/doctor/patients/${assignedAppointments[0].patient_id}`} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Open patient
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {metrics.map(([label, value, color]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Upcoming appointment</p>
        {upcoming ? (
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="font-semibold text-slate-900">{patientNames.get(upcoming.patient_id) || `Patient #${upcoming.patient_id}`}</p>
              <p className="text-sm text-slate-600">{upcoming.appt_date} at {shortTime(upcoming.appt_time)} · {upcoming.reason || 'No reason recorded'}</p>
            </div>
            <Link href={`/doctor/patients/${upcoming.patient_id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-800">Review patient →</Link>
          </div>
        ) : <p className="mt-2 text-sm text-slate-600">No upcoming appointment.</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Today&apos;s appointment queue</h2>
          <p className="mt-1 text-sm text-slate-500">Only appointments assigned to your doctor profile are shown.</p>
        </div>
        {todayAppointments.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No appointments scheduled for today.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {todayAppointments.map((appointment) => (
              <div key={appointment.id} className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
                <div>
                  <p className="font-semibold text-slate-900">{shortTime(appointment.appt_time)} · {patientNames.get(appointment.patient_id) || `Patient #${appointment.patient_id}`}</p>
                  <p className="mt-1 text-sm text-slate-500">Appointment #{appointment.id} · {appointment.reason || 'No reason recorded'}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>
                    {statusLabel(appointment.status)}
                  </span>
                  <Link href={`/doctor/patients/${appointment.patient_id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-800">View patient</Link>
                  {(appointment.status === 'confirmed' || appointment.status === 'checked_in') && (
                    <ClientForm action={startConsultationAction}>
                      <input type="hidden" name="appointment_id" value={appointment.id} />
                      <SubmitButton className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                        Start consultation
                      </SubmitButton>
                    </ClientForm>
                  )}
                  {appointment.status === 'in_progress' && (
                    <Link href={`/doctor/consultation?appointment_id=${appointment.id}`} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                      Continue consultation
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
