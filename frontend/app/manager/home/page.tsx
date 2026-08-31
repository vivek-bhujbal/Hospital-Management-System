import Link from 'next/link'

import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import { ManagerOverview, statusLabel } from '@/lib/managerTypes'

export default async function ManagerDashboard() {
  const overview = await fetchAPI('/manager/overview') as ManagerOverview
  const metrics = [
    ['Today appointments', overview.today_appointments],
    ['Total patients', overview.total_patients],
    ['Active doctors', overview.active_doctors],
    ['Active staff', overview.active_staff],
    ['Completed consultations', overview.completed_consultations],
    ['Pending appointments', overview.pending_appointments],
  ] as const

  return (
    <div className="space-y-6">
      <AutoRefresh interval={60000} />
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Hospital operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Manager Dashboard</h1>
          <p className="mt-1 text-slate-600">Read-only overview of hospital activity, patient flow, staff, and departments.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/manager/appointments" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">View appointments</Link>
          <Link href="/manager/reports" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Open reports</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Patient flow today</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(overview.patient_flow).map(([status, count]) => (
              <div key={status} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm capitalize text-slate-500">{statusLabel(status)}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{count}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Operational alerts</h2>
          {overview.operational_alerts.length === 0 ? (
            <div className="mt-5 rounded-xl bg-emerald-50 p-5 text-sm font-medium text-emerald-800">No operational alerts at this time.</div>
          ) : (
            <ul className="mt-5 space-y-3">
              {overview.operational_alerts.map((alert) => (
                <li key={alert} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{alert}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5">
          <h2 className="text-xl font-semibold text-slate-900">Department summary</h2>
        </div>
        {overview.department_summary.length === 0 ? (
          <p className="p-8 text-center text-slate-500">No departments configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr><th className="px-6 py-4">Department</th><th className="px-6 py-4">Active doctors</th><th className="px-6 py-4">Today appointments</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview.department_summary.map((department) => (
                  <tr key={department.department_id}>
                    <td className="px-6 py-4 font-semibold text-slate-900">{department.name}</td>
                    <td className="px-6 py-4 text-slate-700">{department.active_doctors}</td>
                    <td className="px-6 py-4 text-slate-700">{department.today_appointments}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
