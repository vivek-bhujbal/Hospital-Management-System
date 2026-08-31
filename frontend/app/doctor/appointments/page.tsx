import AutoRefresh from '@/components/AutoRefresh'
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import {
  DoctorAppointment,
  DoctorPatient,
  shortTime,
  statusClass,
  statusLabel,
} from '@/lib/doctorTypes'
import { startConsultationAction } from '@/app/actions/doctor'
import Link from 'next/link'

export default async function DoctorAppointments() {
  const [appointments, patients] = await Promise.all([
    fetchAPI('/appointments/?doctor_id=me') as Promise<DoctorAppointment[]>,
    fetchAPI('/patients/') as Promise<DoctorPatient[]>,
  ])
  const patientNames = new Map(patients.map((patient) => [patient.id, patient.name]))

  return (
    <div className="space-y-6">
      <AutoRefresh interval={30000} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Clinical schedule</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My Appointments</h1>
        <p className="mt-1 text-slate-600">All appointments assigned to your doctor profile.</p>
      </div>

      {appointments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-800">No assigned appointments</p>
          <p className="mt-1 text-sm text-slate-500">New appointments will appear here when they are assigned to you.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Appointment</th>
                  <th className="px-5 py-4">Patient</th>
                  <th className="px-5 py-4">Schedule</th>
                  <th className="px-5 py-4">Reason</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Check-in</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">#{appointment.id}</td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{patientNames.get(appointment.patient_id) || `Patient #${appointment.patient_id}`}</p>
                      <p className="text-sm text-slate-500">Patient #{appointment.patient_id}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">
                      <p>{appointment.appt_date}</p>
                      <p className="mt-1 text-slate-500">{shortTime(appointment.appt_time)}</p>
                    </td>
                    <td className="max-w-xs px-5 py-4 text-sm text-slate-700">{appointment.reason || 'Not recorded'}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(appointment.status)}`}>
                        {statusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700">
                      {appointment.checked_in_at ? 'Checked in' : 'Not checked in'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex min-w-36 flex-col items-end gap-2">
                        <Link href={`/doctor/patients/${appointment.patient_id}`} className="text-sm font-semibold text-blue-700 hover:text-blue-800">View patient</Link>
                        {appointment.status === 'checked_in' && (
                          <ClientForm action={startConsultationAction}>
                            <input type="hidden" name="appointment_id" value={appointment.id} />
                            <SubmitButton className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                              Start consultation
                            </SubmitButton>
                          </ClientForm>
                        )}
                        {appointment.status === 'in_progress' && (
                          <Link href={`/doctor/consultation?appointment_id=${appointment.id}`} className="rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                            Continue / complete
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
