import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { registerPatientAction } from '@/app/actions/receptionist'
import { PERMISSIONS } from '@/lib/permissions'
import { requirePermission } from '@/lib/serverPermissions'

export default async function RegisterPatient() {
  await requirePermission(PERMISSIONS.PATIENTS_CREATE, '/receptionist/home')
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Register New Patient</h1>
        <p className="text-gray-600 mt-1">Enter the patient&apos;s details below to create a new profile in the system.</p>
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl">
        <ClientForm action={registerPatientAction} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input type="text" name="name" required className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400" placeholder="e.g. Jane Doe" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input type="number" name="age" className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400" placeholder="e.g. 35" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select name="gender" className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
              <input type="text" name="contact" className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400" placeholder="+1 (555) 000-0000" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
              <input type="text" name="blood_group" className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400" placeholder="e.g. O+" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
            <textarea name="address" rows={3} className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-gray-400 resize-none" placeholder="Enter full address here..." />
          </div>
          
          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <SubmitButton className="bg-blue-600 text-white px-8 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium">
              Register Patient
            </SubmitButton>
          </div>
        </ClientForm>
      </div>
    </div>
  )
}
