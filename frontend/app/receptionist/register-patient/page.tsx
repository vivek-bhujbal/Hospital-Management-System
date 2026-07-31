import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { registerPatientAction } from '@/app/actions/receptionist'

export default function RegisterPatient() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Register New Patient</h1>
        <p className="text-gray-400 mt-1 text-sm">Enter the patient's details below to create a new profile in the system.</p>
      </div>
      
      <div className="bg-[#1C1F22] p-8 rounded-2xl shadow-xl border border-[#2A2E33] max-w-3xl">
        <ClientForm action={registerPatientAction} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
            <input type="text" name="name" required className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600" placeholder="e.g. Jane Doe" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Age</label>
              <input type="number" name="age" className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600" placeholder="e.g. 35" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Gender</label>
              <select name="gender" className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Contact Number</label>
              <input type="text" name="contact" className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Blood Group</label>
              <input type="text" name="blood_group" className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600" placeholder="e.g. O+" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Address</label>
            <textarea name="address" rows={3} className="w-full bg-[#111315] border border-[#2A2E33] text-white rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-600 resize-none" placeholder="Enter full address here..." />
          </div>
          
          <div className="pt-4 border-t border-[#2A2E33] flex justify-end">
            <SubmitButton className="bg-blue-600 text-white px-8 py-3 rounded-xl hover:bg-blue-500 transition-colors shadow-lg shadow-blue-500/20 font-medium">
              Register Patient
            </SubmitButton>
          </div>
        </ClientForm>
      </div>
    </div>
  )
}
