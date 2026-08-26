import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'

export default async function AdminHome() {
  const overview = await fetchAPI('/admin/overview')

  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <h1 className="text-3xl font-bold text-gray-800">Hospital Administration</h1>
      <p className="text-gray-600">Executive Overview</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Total Patients</h2>
          <p className="text-4xl font-bold text-blue-700 mt-2">{overview.total_patients}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Total Doctors</h2>
          <p className="text-4xl font-bold text-indigo-700 mt-2">{overview.total_doctors}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Today&apos;s Appointments</h2>
          <p className="text-4xl font-bold text-green-700 mt-2">{overview.today_appointments}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Pending Invoices</h2>
          <p className="text-4xl font-bold text-red-600 mt-2">{overview.pending_bills}</p>
        </div>
      </div>
    </div>
  )
}
