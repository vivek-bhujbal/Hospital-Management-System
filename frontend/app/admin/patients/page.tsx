import AdminPatientTable, { AdminPatient } from '@/components/AdminPatientTable'
import { fetchAPI } from '@/lib/api'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function AdminPatients() {
  const patients = await fetchAPI('/admin/patients') as AdminPatient[]
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Patient administration" title="Patients" description="Search and review hospital patient information from the central directory." />
      <AdminPatientTable patients={patients} />
    </div>
  )
}
