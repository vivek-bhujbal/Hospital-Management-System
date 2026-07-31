import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import { updateDoctorProfileAction } from '@/app/actions/doctor'

export default async function DoctorProfile() {
  const profile = await fetchAPI('/doctors/me')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Doctor Profile</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <ClientForm action={updateDoctorProfileAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" defaultValue={profile.name} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Specialization</label>
            <input type="text" name="specialization" defaultValue={profile.specialization || ''} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <input type="text" name="contact" defaultValue={profile.contact || ''} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Shift Start (HH:MM)</label>
              <input type="time" name="timing_start" defaultValue={profile.timing_start || ''} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Shift End (HH:MM)</label>
              <input type="time" name="timing_end" defaultValue={profile.timing_end || ''} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select name="status" defaultValue={profile.status || 'active'} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
          <SubmitButton className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Update Profile
          </SubmitButton>
        </ClientForm>
      </div>
    </div>
  )
}
