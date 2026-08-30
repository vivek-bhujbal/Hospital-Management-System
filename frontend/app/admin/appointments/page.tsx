import AdminAppointmentTable, { AdminAppointment } from '@/components/AdminAppointmentTable'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'

export default async function AdminAppointments() {
  const appointments = await fetchAPI('/admin/appointments') as AdminAppointment[]
  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <div><h1 className="text-3xl font-bold text-gray-900">Appointments</h1><p className="mt-1 text-gray-600">Filter and review hospital appointment status without bypassing workflow rules.</p></div>
      <AdminAppointmentTable appointments={appointments} />
    </div>
  )
}
