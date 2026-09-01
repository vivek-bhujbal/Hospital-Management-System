import AutoRefresh from '@/components/AutoRefresh'
import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { checkinAction, confirmAppointmentAction } from '@/app/actions/receptionist'
import { fetchAPI } from '@/lib/api'
import { hasPermission, PERMISSIONS } from '@/lib/permissions'
import { dateValue, ReceptionAppointment, ReceptionDoctor, ReceptionPatient, shortTime } from '@/lib/receptionistTypes'
import { getCurrentPermissions, requireAnyPermission } from '@/lib/serverPermissions'

const STATUS_STYLES: Record<ReceptionAppointment['status'], string> = {
  requested: 'border-amber-200 bg-amber-50 text-amber-700',
  confirmed: 'border-blue-200 bg-blue-50 text-blue-700',
  checked_in: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  in_progress: 'border-violet-200 bg-violet-50 text-violet-700',
  completed: 'border-slate-200 bg-slate-100 text-slate-700',
  cancelled: 'border-red-200 bg-red-50 text-red-700',
}

function waitingLabel(status: ReceptionAppointment['status']): string {
  if (status === 'requested') return 'Awaiting confirmation'
  if (status === 'confirmed') return 'Waiting for arrival'
  if (status === 'checked_in') return 'Waiting for doctor'
  if (status === 'in_progress') return 'With doctor'
  if (status === 'completed') return 'Completed'
  return 'Cancelled'
}

export default async function ReceptionistQueuePage() {
  await requireAnyPermission(
    [PERMISSIONS.APPOINTMENTS_UPDATE, PERMISSIONS.APPOINTMENTS_CHECKIN],
    '/receptionist/home',
  )
  const today = dateValue()
  const [appointments, patients, doctors, permissions] = await Promise.all([
    fetchAPI(`/appointments/?date=${today}`) as Promise<ReceptionAppointment[]>,
    fetchAPI('/patients/') as Promise<ReceptionPatient[]>,
    fetchAPI('/doctors/') as Promise<ReceptionDoctor[]>,
    getCurrentPermissions(),
  ])
  const patientNames = new Map(patients.map((patient) => [patient.id, patient.name]))
  const doctorNames = new Map(doctors.map((doctor) => [doctor.id, doctor.name]))
  const canConfirm = hasPermission(permissions, PERMISSIONS.APPOINTMENTS_UPDATE)
  const canCheckIn = hasPermission(permissions, PERMISSIONS.APPOINTMENTS_CHECKIN)

  return (
    <div className="space-y-6">
      <AutoRefresh interval={10000} />
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Arrival desk</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Today&apos;s Queue</h1>
        <p className="mt-1 text-slate-600">Confirm appointments and check in arriving patients for {today}.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Appointment</th>
                <th className="px-5 py-4">Patient</th>
                <th className="px-5 py-4">Doctor</th>
                <th className="px-5 py-4">Time</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Waiting state</th>
                <th className="px-5 py-4">Details</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {appointments.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">No appointments scheduled for today.</td></tr>}
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="align-top hover:bg-slate-50">
                  <td className="px-5 py-4 font-semibold text-slate-900">#{appointment.id}</td>
                  <td className="px-5 py-4 text-slate-800">{patientNames.get(appointment.patient_id) || `Patient #${appointment.patient_id}`}</td>
                  <td className="px-5 py-4 text-slate-700">Dr {doctorNames.get(appointment.doctor_id) || `#${appointment.doctor_id}`}</td>
                  <td className="px-5 py-4 font-medium text-slate-800">{shortTime(appointment.appt_time)}</td>
                  <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[appointment.status]}`}>{appointment.status.replaceAll('_', ' ')}</span></td>
                  <td className="px-5 py-4 text-sm text-slate-600">{waitingLabel(appointment.status)}</td>
                  <td className="px-5 py-4 text-sm">
                    <details>
                      <summary className="cursor-pointer font-medium text-blue-700">View</summary>
                      <p className="mt-2 max-w-xs text-slate-600">{appointment.reason || 'No reason recorded.'}</p>
                      {appointment.checked_in_at && <p className="mt-1 text-xs text-slate-500">Checked in: {new Date(appointment.checked_in_at).toLocaleTimeString()}</p>}
                    </details>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      {appointment.status === 'requested' && canConfirm && (
                        <ClientForm action={confirmAppointmentAction} successMessage="Appointment confirmed">
                          <input type="hidden" name="id" value={appointment.id} />
                          <SubmitButton className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Confirm</SubmitButton>
                        </ClientForm>
                      )}
                      {appointment.status === 'confirmed' && canCheckIn && (
                        <ClientForm action={checkinAction} successMessage="Patient checked in">
                          <input type="hidden" name="id" value={appointment.id} />
                          <SubmitButton className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Check in</SubmitButton>
                        </ClientForm>
                      )}
                      {((appointment.status === 'requested' && !canConfirm) || (appointment.status === 'confirmed' && !canCheckIn)) && <span className="text-xs text-slate-400">No permitted action</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
