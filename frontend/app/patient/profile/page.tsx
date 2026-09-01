import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import { fetchAPI } from '@/lib/api'
import { updateProfileAction } from '@/app/actions/patient'
import { PageHeader } from '@/components/ui/HmsUI'

export default async function PatientProfile() {
  const profile = await fetchAPI('/patients/me')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Personal information" title="My profile" description="Keep your contact and basic health information accurate for safer care." />
      
      <section className="hms-card max-w-3xl p-5 sm:p-6">
        <div className="mb-5 border-b pb-4"><h2 className="text-lg font-semibold">Patient information</h2><p className="mt-1 text-sm text-slate-500">These details help your hospital coordinate safer care.</p></div>
        <ClientForm action={updateProfileAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" name="name" defaultValue={profile.name} required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Age</label>
            <input type="number" name="age" defaultValue={profile.age || ''} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Gender</label>
            <select name="gender" defaultValue={profile.gender || ''} className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contact Number</label>
            <input type="text" name="contact" defaultValue={profile.contact || ''} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Blood Group</label>
            <input type="text" name="blood_group" defaultValue={profile.blood_group || ''} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea name="address" defaultValue={profile.address || ''} rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <SubmitButton>
            Update Profile
          </SubmitButton>
        </ClientForm>
      </section>
    </div>
  )
}
