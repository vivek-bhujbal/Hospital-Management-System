import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import Link from 'next/link'

export default async function DoctorHome() {
  const profile = await fetchAPI('/doctors/me')
  const today = new Date().toISOString().split('T')[0]
  const appts = await fetchAPI(`/appointments/?doctor_id=me&date=${today}`)
  
  const pendingAppts = appts.filter((a: any) => a.status === 'checked_in' || a.status === 'confirmed')
  const completedAppts = appts.filter((a: any) => a.status === 'completed')

  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <h1 className="text-3xl font-bold text-gray-800">Welcome, Dr. {profile.name}</h1>
      <p className="text-gray-600">Overview for Today ({today})</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Pending Consultations</h2>
          <p className="text-4xl font-bold text-yellow-600">{pendingAppts.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-green-700">Completed</h2>
          <p className="text-4xl font-bold text-green-700">{completedAppts.length}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Today&apos;s Schedule</h2>
        {appts.length === 0 ? (
          <p className="text-gray-500">No appointments scheduled for today.</p>
        ) : (
          <div className="space-y-4">
            {appts.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center p-4 border rounded shadow-sm">
                <div>
                  <p className="font-bold">{a.appt_time}</p>
                  <p>Patient ID: {a.patient_id}</p>
                  <p className="text-sm text-gray-500">Reason: {a.reason || 'None'}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs rounded font-bold uppercase ${a.status === 'completed' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-800'}`}>
                    {a.status}
                  </span>
                  {a.status === 'checked_in' && (
                    <Link href={`/doctor/consultation?appointment_id=${a.id}`} className="ml-4 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition">
                      Start Consultation
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
