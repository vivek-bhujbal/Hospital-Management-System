import AdminAppointmentTable, { AdminAppointment } from '@/components/AdminAppointmentTable'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function AdminAppointments() {
  const appointments = await fetchAPI('/admin/appointments') as AdminAppointment[]
  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <PageHeader eyebrow="Hospital operations" title="Appointments" description="Filter and review hospital appointment status without bypassing workflow rules." />
      <AdminAppointmentTable appointments={appointments} />
    </div>
  )
}
