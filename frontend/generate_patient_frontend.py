import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend"

api_ts = """import { cookies } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = cookies().get('token')?.value;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store' // Do not cache authenticated requests
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`API Request Failed: ${res.status} ${errorBody}`);
  }
  return res.json();
}
"""

home_page = """import { fetchAPI } from '@/lib/api'

export default async function PatientHome() {
  const profile = await fetchAPI('/patients/me')
  const appts = await fetchAPI('/appointments/me')
  
  const nextAppt = appts.length > 0 ? appts[0] : null
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Welcome, {profile.name}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Next Appointment</h2>
          {nextAppt ? (
            <div>
              <p className="text-lg">Date: <strong>{nextAppt.appt_date}</strong></p>
              <p className="text-lg">Time: <strong>{nextAppt.appt_time}</strong></p>
              <p className="text-gray-600 mt-2">Status: {nextAppt.status}</p>
            </div>
          ) : (
            <p className="text-gray-500">No upcoming appointments.</p>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Quick Stats</h2>
          <p>Total Appointments: {appts.length}</p>
        </div>
      </div>
    </div>
  )
}
"""

appointments_page = """import { fetchAPI } from '@/lib/api'
import Link from 'next/link'
import { bookAppointmentAction } from '@/app/actions/patient'

export default async function PatientAppointments() {
  const appts = await fetchAPI('/appointments/me')
  const doctors = await fetchAPI('/doctors/')
  const profile = await fetchAPI('/patients/me')

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">My Appointments</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Book New Appointment</h2>
        <form action={bookAppointmentAction} className="space-y-4 max-w-md">
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
            <input type="date" name="appt_date" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Time</label>
            <input type="time" name="appt_time" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <input type="text" name="reason" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Book Appointment
          </button>
        </form>
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
"""

prescriptions_page = """import { fetchAPI } from '@/lib/api'

export default async function PatientPrescriptions() {
  const prescriptions = await fetchAPI('/prescriptions/me')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">My Prescriptions</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        {prescriptions.length === 0 ? (
          <p className="text-gray-500">No prescriptions found.</p>
        ) : (
          <ul className="space-y-4">
            {prescriptions.map((p: any) => (
              <li key={p.id} className="p-4 border rounded shadow-sm">
                <p><strong>Diagnosis:</strong> {p.diagnosis}</p>
                <p><strong>Medicine:</strong> {p.medicine}</p>
                <p><strong>Dosage:</strong> {p.dosage}</p>
                <p><strong>Notes:</strong> {p.notes}</p>
                <p className="text-sm text-gray-500 mt-2">Issued on: {new Date(p.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
"""

billing_page = """import { fetchAPI } from '@/lib/api'

export default async function PatientBilling() {
  const bills = await fetchAPI('/billing/me')
  const totalDues = bills.filter((b: any) => b.status === 'pending').reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Billing & Dues</h1>
      
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <h2 className="text-xl font-bold text-red-700">Total Dues: ${totalDues.toFixed(2)}</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Invoice History</h2>
        {bills.length === 0 ? (
          <p className="text-gray-500">No bills found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map((b: any) => (
                <tr key={b.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">${b.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{b.payment_method || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
"""

profile_page = """import { fetchAPI } from '@/lib/api'
import { updateProfileAction } from '@/app/actions/patient'

export default async function PatientProfile() {
  const profile = await fetchAPI('/patients/me')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">My Profile</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <form action={updateProfileAction} className="space-y-4">
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
          
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Update Profile
          </button>
        </form>
      </div>
    </div>
  )
}
"""

actions_ts = """'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function getAuthHeaders() {
  const token = cookies().get('token')?.value;
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
}

export async function bookAppointmentAction(formData: FormData) {
  const payload = {
    patient_id: parseInt(formData.get('patient_id') as string),
    doctor_id: parseInt(formData.get('doctor_id') as string),
    appt_date: formData.get('appt_date'),
    appt_time: formData.get('appt_time'),
    reason: formData.get('reason')
  }

  const res = await fetch(`${API_URL}/appointments/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    console.error(await res.text())
    throw new Error("Failed to book appointment")
  }

  revalidatePath('/patient/appointments')
  revalidatePath('/patient/home')
}

export async function updateProfileAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    age: formData.get('age') ? parseInt(formData.get('age') as string) : null,
    gender: formData.get('gender') || null,
    contact: formData.get('contact'),
    blood_group: formData.get('blood_group'),
    address: formData.get('address')
  }

  const res = await fetch(`${API_URL}/patients/me`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    console.error(await res.text())
    throw new Error("Failed to update profile")
  }

  revalidatePath('/patient/profile')
  revalidatePath('/patient/home')
}
"""

files = {
    "lib/api.ts": api_ts,
    "app/patient/home/page.tsx": home_page,
    "app/patient/appointments/page.tsx": appointments_page,
    "app/patient/prescriptions/page.tsx": prescriptions_page,
    "app/patient/billing/page.tsx": billing_page,
    "app/patient/profile/page.tsx": profile_page,
    "app/actions/patient.ts": actions_ts
}

# Create actions dir if not exists
os.makedirs(os.path.join(base_dir, "app/actions"), exist_ok=True)

for fpath, content in files.items():
    with open(os.path.join(base_dir, fpath), "w", encoding="utf-8") as f:
        f.write(content)

print("Frontend patient module updated successfully.")
