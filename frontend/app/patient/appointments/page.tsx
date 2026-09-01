import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import Link from 'next/link'
import { bookAppointmentAction } from '@/app/actions/patient'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/HmsUI'

export default async function PatientAppointments() {
  const appts = await fetchAPI('/appointments/me')
  const doctors = await fetchAPI('/doctors/')
  const profile = await fetchAPI('/patients/me')

  return (
    <div className="space-y-8">
      <AutoRefresh interval={5000} />
      <PageHeader eyebrow="My care" title="Appointments" description="Book a visit and track every appointment through its care journey." />
      
      <section className="hms-card p-5 sm:p-6">
        <h2 className="text-xl font-semibold mb-1">Book a new appointment</h2>
        <p className="mb-5 text-sm text-slate-500">Choose your doctor, preferred date and time, and briefly tell us the reason for your visit.</p>
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
          
          <SubmitButton>
            Book Appointment
          </SubmitButton>
        </ClientForm>
      </section>

      <section className="hms-card overflow-hidden">
        <h2 className="border-b px-5 py-4 text-xl font-semibold">Appointment history</h2>
        {appts.length === 0 ? (
          <EmptyState title="No appointments yet" description="Your booked and completed visits will appear here." />
        ) : (
          <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200">
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
                    <StatusBadge status={appt.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{appt.reason || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  )
}
