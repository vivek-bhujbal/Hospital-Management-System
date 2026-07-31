import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import { bookAppointmentAction } from '@/app/actions/receptionist'
import { requirePermission } from '@/lib/permissions'

export default async function ReceptionistSchedule() {
  requirePermission('can_schedule_appointment')
  const patients = await fetchAPI('/patients/')
  const doctors = await fetchAPI('/doctors/')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Schedule Appointment</h1>
        <p className="text-gray-600 mt-1">Book a new consultation for an existing patient.</p>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
        <ClientForm action={bookAppointmentAction} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
            <select name="patient_id" required className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all">
              <option value="">Select a patient...</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Doctor</label>
            <select name="doctor_id" required className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all">
              <option value="">Select a doctor...</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input type="date" name="appt_date" required min={new Date().toISOString().split("T")[0]} className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
              <input type="time" name="appt_time" required className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
            <input type="text" name="reason" className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400" placeholder="e.g. Follow-up, General Checkup" />
          </div>
          
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <SubmitButton className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium">
              Confirm Booking
            </SubmitButton>
          </div>
        </ClientForm>
      </div>
    </div>
  )
}
