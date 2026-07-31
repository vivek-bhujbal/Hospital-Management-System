import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import { bookAppointmentAction } from '@/app/actions/receptionist'

export default async function ReceptionistSchedule() {
  const patients = await fetchAPI('/patients/')
  const doctors = await fetchAPI('/doctors/')

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Schedule Appointment</h1>
        <p className="text-gray-400 mt-1 text-sm">Book a new consultation for an existing patient.</p>
      </div>
      
      <div className="bg-[#1C1F22] p-8 rounded-2xl shadow-xl border border-[#2A2E33] max-w-3xl">
        <ClientForm action={bookAppointmentAction} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Patient</label>
            <select name="patient_id" required className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
              <option value="">Select a patient...</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Doctor</label>
            <select name="doctor_id" required className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
              <option value="">Select a doctor...</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Date</label>
              <input type="date" name="appt_date" required min={new Date().toISOString().split("T")[0]} className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all [color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Time</label>
              <input type="time" name="appt_time" required className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all [color-scheme:dark]" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Reason</label>
            <input type="text" name="reason" className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600" placeholder="e.g. Follow-up, General Checkup" />
          </div>
          
          <div className="pt-4 border-t border-[#2A2E33] flex justify-end">
            <SubmitButton className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 font-medium">
              Confirm Booking
            </SubmitButton>
          </div>
        </ClientForm>
      </div>
    </div>
  )
}
