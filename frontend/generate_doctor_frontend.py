import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend"

actions_ts = """'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  const token = cookies().get('token')?.value;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

export async function completeConsultationAction(formData: FormData) {
  const payload = {
    appointment_id: parseInt(formData.get('appointment_id') as string),
    diagnosis: formData.get('diagnosis'),
    medicine: formData.get('medicine'),
    dosage: formData.get('dosage'),
    notes: formData.get('notes')
  }

  const res = await fetch(`${API_URL}/prescriptions/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(text)
    throw new Error("Failed to complete consultation")
  }

  revalidatePath('/doctor/home')
  revalidatePath('/doctor/appointments')
  redirect('/doctor/home')
}

export async function updateDoctorProfileAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    specialization: formData.get('specialization'),
    contact: formData.get('contact'),
    timing_start: formData.get('timing_start') || null,
    timing_end: formData.get('timing_end') || null,
    status: formData.get('status') || 'active'
  }

  const res = await fetch(`${API_URL}/doctors/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) throw new Error("Failed to update profile")

  revalidatePath('/doctor/profile')
}
"""

home_page = """import { fetchAPI } from '@/lib/api'
import Link from 'next/link'

export default async function DoctorHome() {
  const profile = await fetchAPI('/doctors/me')
  const today = new Date().toISOString().split('T')[0]
  const appts = await fetchAPI(`/appointments/?doctor_id=me&date=${today}`)
  
  const pendingAppts = appts.filter((a: any) => a.status === 'checked_in' || a.status === 'confirmed')
  const completedAppts = appts.filter((a: any) => a.status === 'completed')

  return (
    <div className="space-y-6">
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
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Today's Schedule</h2>
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
"""

appointments_page = """import { fetchAPI } from '@/lib/api'

export default async function DoctorAppointments() {
  const appts = await fetchAPI(`/appointments/?doctor_id=me`)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">All Appointments</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appts.map((a: any) => (
              <tr key={a.id}>
                <td className="px-6 py-4 whitespace-nowrap">{a.appt_date}</td>
                <td className="px-6 py-4 whitespace-nowrap">{a.appt_time}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{a.patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {a.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
"""

patients_page = """import { fetchAPI } from '@/lib/api'
import Link from 'next/link'

export default async function DoctorPatients() {
  const patients = await fetchAPI('/patients/')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Patient Directory</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map((p: any) => (
          <div key={p.id} className="border p-4 rounded-lg shadow-sm hover:shadow-md transition">
            <h3 className="font-bold text-lg">{p.name}</h3>
            <p className="text-gray-600 text-sm mb-4">Age: {p.age || '-'} | Blood: {p.blood_group || '-'}</p>
            <Link href={`/doctor/patients/${p.id}`} className="text-blue-600 hover:underline text-sm font-medium">
              View History &rarr;
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
"""

patient_history_page = """import { fetchAPI } from '@/lib/api'
import Link from 'next/link'

export default async function PatientHistory({ params }: { params: { id: string } }) {
  const history = await fetchAPI(`/patients/${params.id}/history`)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/doctor/patients" className="text-blue-600 hover:underline">&larr; Back to Directory</Link>
        <h1 className="text-3xl font-bold text-gray-800">Patient #{params.id} History</h1>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Past Prescriptions & Diagnoses</h2>
        {history.prescriptions.length === 0 ? (
          <p className="text-gray-500">No medical history found.</p>
        ) : (
          <div className="space-y-4">
            {history.prescriptions.map((p: any) => (
              <div key={p.id} className="p-4 border rounded shadow-sm bg-gray-50">
                <p><strong>Date:</strong> {new Date(p.created_at).toLocaleDateString()}</p>
                <p><strong>Diagnosis:</strong> {p.diagnosis}</p>
                <p><strong>Medicine:</strong> {p.medicine}</p>
                <p><strong>Dosage:</strong> {p.dosage}</p>
                <p className="text-sm mt-2 text-gray-600">Notes: {p.notes}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
"""

consultation_page = """import { completeConsultationAction } from '@/app/actions/doctor'

export default function DoctorConsultation({ searchParams }: { searchParams: { appointment_id?: string } }) {
  const apptId = searchParams.appointment_id

  if (!apptId) {
    return <div className="p-4 text-red-600">Error: No appointment ID provided for consultation.</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Active Consultation</h1>
      <p className="text-gray-600">Appointment ID: #{apptId}</p>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <form action={completeConsultationAction} className="space-y-4">
          <input type="hidden" name="appointment_id" value={apptId} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
            <textarea name="diagnosis" required rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Medicine</label>
            <input type="text" name="medicine" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Dosage Instructions</label>
            <input type="text" name="dosage" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
            <textarea name="notes" rows={2} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition font-bold">
            Save and Complete
          </button>
        </form>
      </div>
    </div>
  )
}
"""

profile_page = """import { fetchAPI } from '@/lib/api'
import { updateDoctorProfileAction } from '@/app/actions/doctor'

export default async function DoctorProfile() {
  const profile = await fetchAPI('/doctors/me')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Doctor Profile</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <form action={updateDoctorProfileAction} className="space-y-4">
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
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Update Profile
          </button>
        </form>
      </div>
    </div>
  )
}
"""

files = {
    "app/actions/doctor.ts": actions_ts,
    "app/doctor/home/page.tsx": home_page,
    "app/doctor/appointments/page.tsx": appointments_page,
    "app/doctor/patients/page.tsx": patients_page,
    "app/doctor/patients/[id]/page.tsx": patient_history_page,
    "app/doctor/consultation/page.tsx": consultation_page,
    "app/doctor/profile/page.tsx": profile_page
}

# Ensure dynamic dir exists
os.makedirs(os.path.join(base_dir, "app/doctor/patients/[id]"), exist_ok=True)

for fpath, content in files.items():
    with open(os.path.join(base_dir, fpath), "w", encoding="utf-8") as f:
        f.write(content)

print("Frontend doctor module updated successfully.")
