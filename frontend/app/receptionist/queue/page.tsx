import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import { checkinAction } from '@/app/actions/receptionist'
import { requirePermission } from '@/lib/permissions'

export default async function CheckInQueue() {
  requirePermission('can_checkin_patient')
  const today = new Date().toISOString().split('T')[0]
  const appts = await fetchAPI(`/appointments/?date=${today}`)
  
  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Check-in Queue</h1>
        <p className="text-gray-600 mt-1">Manage patient arrivals for {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</p>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient ID</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor ID</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {appts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-8 text-center text-gray-500">No appointments scheduled for today.</td>
                </tr>
              )}
              {appts.map((a: any) => (
                <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap text-gray-800 font-medium">{a.appt_time}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-gray-600">#{a.patient_id}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-gray-600">#{a.doctor_id}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${a.status === 'checked_in' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    {a.status !== 'checked_in' && a.status !== 'completed' && a.status !== 'cancelled' && (
                      <ClientForm action={checkinAction}>
                        <input type="hidden" name="id" value={a.id} />
                        <SubmitButton className="text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors">
                          Check in
                        </SubmitButton>
                      </ClientForm>
                    )}
                    {a.status === 'checked_in' && (
                      <span className="text-gray-400 text-sm italic">Checked In</span>
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
