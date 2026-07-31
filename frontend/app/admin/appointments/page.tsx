import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'

export default async function AdminAppointments() {
  const appts = await fetchAPI('/admin/appointments')

  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <h1 className="text-3xl font-bold text-gray-800">Hospital Appointments</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appt ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date / Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appts.map((a: any) => (
              <tr key={a.id}>
                <td className="px-6 py-4 whitespace-nowrap">#{a.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{a.appt_date} {a.appt_time}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{a.patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{a.doctor_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100`}>
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
