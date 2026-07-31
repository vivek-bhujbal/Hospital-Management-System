import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'

export default async function PatientHome() {
  const profile = await fetchAPI('/patients/me')
  const appts = await fetchAPI('/appointments/me')
  
  const nextAppt = appts.length > 0 ? appts[0] : null
  
  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <h1 className="text-3xl font-bold text-gray-800">Welcome, {profile.name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Next Appointment</h2>
          {nextAppt ? (
            <div>
              <p className="text-lg">Date: <strong>{nextAppt.appt_date}</strong></p>
              <p className="text-lg">Time: <strong>{nextAppt.appt_time}</strong></p>
              <p className="text-gray-600 mt-2">Status: {nextAppt.status}</p>
            </div>
          ) : (
            <p className="text-gray-500">No upcoming appointments.</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Quick Stats</h2>
          <p>Total Appointments: {appts.length}</p>
        </div>
      </div>
    </div>
  )
}
