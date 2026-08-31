import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import { updateDoctorProfileAction } from '@/app/actions/doctor'
import { DoctorProfile as DoctorProfileData } from '@/lib/doctorTypes'

export default async function DoctorProfile() {
  const profile = await fetchAPI('/doctors/me') as DoctorProfileData

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Professional settings</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Doctor Profile</h1>
        <p className="mt-1 text-slate-600">Update your professional information, contact number, and working schedule.</p>
      </div>
      
      <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
          <SubmitButton className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Update Profile
          </SubmitButton>
        </ClientForm>
      </div>
    </div>
  )
}
