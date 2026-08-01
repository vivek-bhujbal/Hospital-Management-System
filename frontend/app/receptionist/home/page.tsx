import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import { Users, UserCheck } from 'lucide-react'

export default async function ReceptionistHome() {
  const today = new Date().toISOString().split('T')[0]
  const allAppts = await fetchAPI(`/appointments/`).catch(() => [])
  
  const total = allAppts.length || 0
  const checkedIn = allAppts.filter((a: any) => a.appt_date === today && a.status === 'checked_in').length || 0
  
  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Overview</h1>
        <p className="text-gray-600 mt-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Total Appointments</h2>
          </div>
          <p className="text-4xl font-bold text-gray-800">{total}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase">Checked In</h2>
          </div>
          <p className="text-4xl font-bold text-gray-800">{checkedIn}</p>
        </div>
      </div>
    </div>
  )
}
