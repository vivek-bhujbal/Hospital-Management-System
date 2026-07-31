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

export async function registerPatientAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    age: formData.get('age') ? parseInt(formData.get('age') as string) : null,
    gender: formData.get('gender') || null,
    contact: formData.get('contact'),
    address: formData.get('address'),
    blood_group: formData.get('blood_group')
  }

  const res = await fetch(`${API_URL}/patients/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) throw new Error("Failed to register patient")

  revalidatePath('/receptionist/home')
  redirect('/receptionist/home')
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

  if (!res.ok) throw new Error("Failed to book appointment")
  revalidatePath('/receptionist/schedule')
  redirect('/receptionist/queue')
}

export async function checkinAction(formData: FormData) {
  const id = formData.get('id')
  const res = await fetch(`${API_URL}/appointments/${id}/checkin`, {
    method: 'PATCH',
    headers: getAuthHeaders()
  })
  if (!res.ok) throw new Error("Check-in failed")
  revalidatePath('/receptionist/queue')
}

export async function collectPaymentAction(formData: FormData) {
  const id = formData.get('id')
  const payment_method = formData.get('payment_method')
  
  const res = await fetch(`${API_URL}/billing/${id}/collect?payment_method=${payment_method}`, {
    method: 'POST',
    headers: getAuthHeaders()
  })
  
  if (!res.ok) throw new Error("Payment collection failed")
  revalidatePath('/receptionist/billing')
}
"""

home_page = """import { fetchAPI } from '@/lib/api'

export default async function ReceptionistHome() {
  const today = new Date().toISOString().split('T')[0]
  const appts = await fetchAPI(`/appointments/?date=${today}`)
  
  const total = appts.length
  const checkedIn = appts.filter((a: any) => a.status === 'checked_in').length
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Receptionist Dashboard</h1>
      <p className="text-gray-600">Overview for Today ({today})</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-blue-800">Today's Appointments</h2>
          <p className="text-4xl font-bold">{total}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-green-700">Checked In</h2>
          <p className="text-4xl font-bold text-green-700">{checkedIn}</p>
        </div>
      </div>
    </div>
  )
}
"""

register_patient_page = """import { registerPatientAction } from '@/app/actions/receptionist'

export default function RegisterPatient() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Register New Patient</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <form action={registerPatientAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name</label>
            <input type="text" name="name" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Age</label>
              <input type="number" name="age" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select name="gender" className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Contact Number</label>
              <input type="text" name="contact" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Blood Group</label>
              <input type="text" name="blood_group" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <textarea name="address" rows={3} className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Register Patient
          </button>
        </form>
      </div>
    </div>
  )
}
"""

schedule_page = """import { fetchAPI } from '@/lib/api'
import { bookAppointmentAction } from '@/app/actions/receptionist'

export default async function ReceptionistSchedule() {
  const patients = await fetchAPI('/patients/')
  const doctors = await fetchAPI('/doctors/')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Book Appointment</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <form action={bookAppointmentAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Patient</label>
            <select name="patient_id" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              <option value="">Select a patient...</option>
              {patients.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name} (ID: {p.id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Doctor</label>
            <select name="doctor_id" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md">
              <option value="">Select a doctor...</option>
              {doctors.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input type="date" name="appt_date" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Time</label>
              <input type="time" name="appt_time" required className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Reason</label>
            <input type="text" name="reason" className="mt-1 block w-full p-2 border border-gray-300 rounded-md" />
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
            Confirm Booking
          </button>
        </form>
      </div>
    </div>
  )
}
"""

queue_page = """import { fetchAPI } from '@/lib/api'
import { checkinAction } from '@/app/actions/receptionist'

export default async function CheckInQueue() {
  const today = new Date().toISOString().split('T')[0]
  const appts = await fetchAPI(`/appointments/?date=${today}`)
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Check-in Queue (Today)</h1>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appts.map((a: any) => (
              <tr key={a.id}>
                <td className="px-6 py-4 whitespace-nowrap">{a.appt_time}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{a.patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{a.doctor_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${a.status === 'checked_in' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {a.status !== 'checked_in' && a.status !== 'completed' && a.status !== 'cancelled' && (
                    <form action={checkinAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="text-blue-600 hover:text-blue-900 border border-blue-600 rounded px-3 py-1 text-sm font-medium hover:bg-blue-50">
                        Check in
                      </button>
                    </form>
                  )}
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

billing_page = """import { fetchAPI } from '@/lib/api'
import { collectPaymentAction } from '@/app/actions/receptionist'

export default async function ReceptionistBilling() {
  const bills = await fetchAPI('/billing/')
  const settings = await fetchAPI('/admin/settings')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Billing Desk</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Pending & Recent Invoices</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action / Receipt</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bills.map((b: any) => (
              <tr key={b.id}>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(b.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{b.patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">${b.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {b.status === 'pending' ? (
                    <form action={collectPaymentAction} className="flex gap-2 items-center">
                      <input type="hidden" name="id" value={b.id} />
                      <select name="payment_method" required className="border p-1 text-sm rounded">
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                      </select>
                      <button type="submit" className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                        Collect
                      </button>
                    </form>
                  ) : (
                    <div className="text-sm">
                      <p className="font-semibold text-gray-700">{b.receipt_no}</p>
                      <div className="text-xs text-gray-500">
                        {settings.hospital_name} | GSTIN: {settings.gstin}
                      </div>
                    </div>
                  )}
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

files = {
    "app/actions/receptionist.ts": actions_ts,
    "app/receptionist/home/page.tsx": home_page,
    "app/receptionist/register-patient/page.tsx": register_patient_page,
    "app/receptionist/schedule/page.tsx": schedule_page,
    "app/receptionist/queue/page.tsx": queue_page,
    "app/receptionist/billing/page.tsx": billing_page
}

for fpath, content in files.items():
    with open(os.path.join(base_dir, fpath), "w", encoding="utf-8") as f:
        f.write(content)

print("Frontend receptionist module updated successfully.")
