import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import { checkinAction } from '@/app/actions/receptionist'

export default async function CheckInQueue() {
  const today = new Date().toISOString().split('T')[0]
  const appts = await fetchAPI(`/appointments/?date=${today}`)
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <AutoRefresh interval={5000} />
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Check-in Queue</h1>
        <p className="text-gray-400 mt-1 text-sm">Manage patient arrivals for {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</p>
      </div>
      
      <div className="bg-[#1C1F22] rounded-2xl shadow-xl border border-[#2A2E33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#2A2E33]">
            <thead className="bg-[#111315]">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Patient ID</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Doctor ID</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E33] bg-[#1C1F22]">
              {appts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-8 text-center text-gray-500">No appointments scheduled for today.</td>
                </tr>
              )}
              {appts.map((a: any) => (
                <tr key={a.id} className="hover:bg-[#25282D] transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap text-white font-medium">{a.appt_time}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-gray-300">#{a.patient_id}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-gray-300">#{a.doctor_id}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${a.status === 'checked_in' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    {a.status !== 'checked_in' && a.status !== 'completed' && a.status !== 'cancelled' && (
                      <ClientForm action={checkinAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <SubmitButton className="text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors">
                          Check in
                        </SubmitButton>
                      </ClientForm>
                    )}
                    {a.status === 'checked_in' && (
                      <span className="text-gray-500 text-sm italic">Checked In</span>
                    )}
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
