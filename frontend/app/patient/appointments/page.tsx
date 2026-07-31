import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import Link from 'next/link'
import { bookAppointmentAction } from '@/app/actions/patient'

export default async function PatientAppointments() {
  const appts = await fetchAPI('/appointments/me')
  const doctors = await fetchAPI('/doctors/')
  const profile = await fetchAPI('/patients/me')

  return (
    <div className="space-y-8">
      <AutoRefresh interval={5000} />
      <h1 className="text-3xl font-bold text-gray-800">My Appointments</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Book New Appointment</h2>
        <ClientForm action={bookAppointmentAction} className="space-y-4 max-w-md">
          <input type="hidden" name="patient_id" value={profile.id} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Doctor</label>
            <select name="doctor_id" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input type="date" name="appt_date" required min={new Date().toISOString().split("T")[0]} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <input type="time" name="appt_time" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <input type="text" name="reason" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <SubmitButton className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Book Appointment
          </SubmitButton>
        </ClientForm>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Appointment History</h2>
        {appts.length === 0 ? (
          <p className="text-gray-500">No appointments found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {appts.map((appt: any) => (
                <tr key={appt.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{appt.appt_date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{appt.appt_time}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{appt.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
