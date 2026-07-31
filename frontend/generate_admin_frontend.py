import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend"

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

export async function addDoctorAction(formData: FormData) {
  const payload = {
    name: formData.get('name'),
    specialization: formData.get('specialization'),
    contact: formData.get('contact'),
    timing_start: formData.get('timing_start') || null,
    timing_end: formData.get('timing_end') || null,
    status: formData.get('status') || 'active'
  }

  const res = await fetch(`${API_URL}/admin/doctors`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) throw new Error("Failed to add doctor")
  revalidatePath('/admin/doctors')
}

export async function editDoctorAction(formData: FormData) {
  const id = formData.get('id')
  const payload = {
    name: formData.get('name'),
    specialization: formData.get('specialization'),
    contact: formData.get('contact'),
    timing_start: formData.get('timing_start') || null,
    timing_end: formData.get('timing_end') || null,
    status: formData.get('status') || 'active'
  }

  const res = await fetch(`${API_URL}/admin/doctors/${id}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  })

  if (!res.ok) throw new Error("Failed to update doctor")
  revalidatePath('/admin/doctors')
}

export async function deleteDoctorAction(formData: FormData) {
  const id = formData.get('id')
  const res = await fetch(`${API_URL}/admin/doctors/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  if (!res.ok) throw new Error("Failed to delete doctor")
  revalidatePath('/admin/doctors')
}
"""

home_page = """import { fetchAPI } from '@/lib/api'

export default async function AdminHome() {
  const overview = await fetchAPI('/admin/overview')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Hospital Administration</h1>
      <p className="text-gray-600">Executive Overview</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Total Patients</h2>
          <p className="text-4xl font-bold text-blue-700 mt-2">{overview.total_patients}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Total Doctors</h2>
          <p className="text-4xl font-bold text-indigo-700 mt-2">{overview.total_doctors}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Today's Appointments</h2>
          <p className="text-4xl font-bold text-green-700 mt-2">{overview.today_appointments}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-500 uppercase">Pending Invoices</h2>
          <p className="text-4xl font-bold text-red-600 mt-2">{overview.pending_bills}</p>
        </div>
      </div>
    </div>
  )
}
"""

doctors_page = """import { fetchAPI } from '@/lib/api'
import { addDoctorAction, deleteDoctorAction, editDoctorAction } from '@/app/actions/admin'

export default async function AdminDoctors() {
  const doctors = await fetchAPI('/admin/doctors')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Manage Doctors</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Add New Doctor Profile</h2>
        <form action={addDoctorAction} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" name="name" placeholder="Name" required className="border p-2 rounded" />
          <input type="text" name="specialization" placeholder="Specialization" required className="border p-2 rounded" />
          <input type="text" name="contact" placeholder="Contact" required className="border p-2 rounded" />
          <input type="time" name="timing_start" required className="border p-2 rounded" />
          <input type="time" name="timing_end" required className="border p-2 rounded" />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Add Doctor</button>
        </form>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialty</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {doctors.map((d: any) => (
              <tr key={d.id}>
                <td className="px-6 py-4 whitespace-nowrap">#{d.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{d.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{d.specialization}</td>
                <td className="px-6 py-4 whitespace-nowrap">{d.timing_start} - {d.timing_end}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex gap-2">
                    <form action={deleteDoctorAction}>
                      <input type="hidden" name="id" value={d.id} />
                      <button type="submit" className="text-red-600 hover:text-red-900 border border-red-200 px-2 rounded">Delete</button>
                    </form>
                  </div>
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

export default async function AdminPatients() {
  const patients = await fetchAPI('/admin/patients')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">All Patients</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age/Gender</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blood Group</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {patients.map((p: any) => (
              <tr key={p.id}>
                <td className="px-6 py-4 whitespace-nowrap">#{p.id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{p.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{p.age} / {p.gender}</td>
                <td className="px-6 py-4 whitespace-nowrap">{p.contact}</td>
                <td className="px-6 py-4 whitespace-nowrap font-bold text-red-600">{p.blood_group}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
"""

appointments_page = """import { fetchAPI } from '@/lib/api'

export default async function AdminAppointments() {
  const appts = await fetchAPI('/admin/appointments')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Hospital Appointments</h1>
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Appt ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date / Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Doctor ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {appts.map((a: any) => (
              <tr key={a.id}>
                <td className="px-6 py-4 whitespace-nowrap">#{a.id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{a.appt_date} {a.appt_time}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{a.patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{a.doctor_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100`}>
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

billing_page = """import { fetchAPI } from '@/lib/api'

export default async function AdminBilling() {
  const report = await fetchAPI('/admin/billing/report')

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Financial Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-green-700">Total Collected Revenue</h2>
          <p className="text-4xl font-bold text-green-700">${report.paid_total.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Pending Dues</h2>
          <p className="text-4xl font-bold text-red-600">${report.pending_total.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Transactions</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {report.recent_transactions.map((t: any) => (
              <tr key={t.id}>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{t.patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">${t.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{t.payment_method || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{t.receipt_no || '-'}</td>
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
    "app/actions/admin.ts": actions_ts,
    "app/admin/home/page.tsx": home_page,
    "app/admin/doctors/page.tsx": doctors_page,
    "app/admin/patients/page.tsx": patients_page,
    "app/admin/appointments/page.tsx": appointments_page,
    "app/admin/billing/page.tsx": billing_page
}

for fpath, content in files.items():
    with open(os.path.join(base_dir, fpath), "w", encoding="utf-8") as f:
        f.write(content)

print("Frontend admin module updated successfully.")
