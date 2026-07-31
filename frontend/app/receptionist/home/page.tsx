import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import { Users, UserCheck } from 'lucide-react'

export default async function ReceptionistHome() {
  const today = new Date().toISOString().split('T')[0]
  const appts = await fetchAPI(`/appointments/?date=${today}`)
  
  const total = appts.length || 0
  const checkedIn = appts.filter((a: any) => a.status === 'checked_in').length || 0
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <AutoRefresh interval={5000} />
      
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Overview</h1>
        <p className="text-gray-400 mt-1 text-sm font-medium uppercase tracking-wider">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#1C1F22] p-8 rounded-2xl shadow-xl border border-[#2A2E33] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-500/20"></div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-300">Total Appointments</h2>
          </div>
          <p className="text-5xl font-bold text-white relative z-10 tracking-tight">{total}</p>
        </div>

        <div className="bg-[#1C1F22] p-8 rounded-2xl shadow-xl border border-[#2A2E33] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-500/20"></div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
              <UserCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-300">Checked In</h2>
          </div>
          <p className="text-5xl font-bold text-emerald-400 relative z-10 tracking-tight">{checkedIn}</p>
        </div>
      </div>
    </div>
  )
}
