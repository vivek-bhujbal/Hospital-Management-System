import AdminPatientTable, { AdminPatient } from '@/components/AdminPatientTable'
import { fetchAPI } from '@/lib/api'

export default async function AdminPatients() {
  const patients = await fetchAPI('/admin/patients') as AdminPatient[]
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-gray-900">Patients</h1><p className="mt-1 text-gray-600">Search and review hospital patient information.</p></div>
      <AdminPatientTable patients={patients} />
    </div>
  )
}
