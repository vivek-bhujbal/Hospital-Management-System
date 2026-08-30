import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'

interface RecentAppointment {
  id: number
  patient_id: number
  doctor_id: number
  appt_date: string
  appt_time: string
  status: string
}

interface RecentBilling {
  id: number
  patient_id: number
  amount: number | string
  status: string
  created_at: string
}

interface AdminOverview {
  total_patients: number
  total_doctors: number
  today_appointments: number
  pending_bills: number
  collected_revenue: number
  recent_appointments: RecentAppointment[]
  recent_billing: RecentBilling[]
}

export default async function AdminHome() {
  const overview = await fetchAPI('/admin/overview') as AdminOverview
  const cards = [
    ['Total patients', overview.total_patients, 'text-blue-700'],
    ['Total doctors', overview.total_doctors, 'text-indigo-700'],
    ["Today's appointments", overview.today_appointments, 'text-green-700'],
    ['Pending bills', overview.pending_bills, 'text-red-600'],
    ['Collected revenue', `₹${overview.collected_revenue.toFixed(2)}`, 'text-emerald-700'],
  ] as const

  return (
    <div className="space-y-8">
      <AutoRefresh interval={5000} />
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hospital operations</h1>
        <p className="mt-1 text-gray-600">Patients, clinical staffing, appointments, and billing.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value, color]) => (
          <section key={label} className="rounded-xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase text-gray-500">{label}</h2>
            <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
          </section>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <h2 className="border-b p-5 text-xl font-semibold text-gray-900">Recent appointments</h2>
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-4">Date/time</th><th className="p-4">Patient</th><th className="p-4">Doctor</th><th className="p-4">Status</th></tr></thead>
            <tbody className="divide-y">
              {overview.recent_appointments.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">No appointments yet.</td></tr> : overview.recent_appointments.map((appointment) => (
                <tr key={appointment.id}><td className="p-4">{appointment.appt_date} {appointment.appt_time}</td><td className="p-4">#{appointment.patient_id}</td><td className="p-4">#{appointment.doctor_id}</td><td className="p-4 capitalize">{appointment.status.replaceAll('_', ' ')}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <h2 className="border-b p-5 text-xl font-semibold text-gray-900">Recent billing activity</h2>
          <table className="min-w-full divide-y text-sm">
            <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-4">Created</th><th className="p-4">Patient</th><th className="p-4">Amount</th><th className="p-4">Status</th></tr></thead>
            <tbody className="divide-y">
              {overview.recent_billing.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-500">No billing activity yet.</td></tr> : overview.recent_billing.map((bill) => (
                <tr key={bill.id}><td className="p-4">{new Date(bill.created_at).toLocaleString()}</td><td className="p-4">#{bill.patient_id}</td><td className="p-4">₹{Number(bill.amount).toFixed(2)}</td><td className="p-4 capitalize">{bill.status}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  )
}
