import Link from 'next/link'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import type { LabDashboard } from '@/lib/labTypes'

export default async function LabDashboardPage() {
  const data = await fetchAPI('/lab/dashboard') as LabDashboard
  const metrics = [
    ['Pending lab orders', data.pending_lab_orders], ['Samples collected', data.samples_collected],
    ['Tests in progress', data.tests_in_progress], ['Completed tests', data.completed_tests],
    ['Urgent tests', data.urgent_tests], ["Today's workload", data.today_workload],
  ] as const
  return <div className="space-y-6"><AutoRefresh interval={30000}/><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Laboratory operations</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Lab Technician Dashboard</h1><p className="mt-1 text-slate-600">Your authorized test orders, samples, processing queue, and workload.</p></div><div className="flex gap-2"><Link href="/lab/orders" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Open lab orders</Link><Link href="/lab/results" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">Results</Link></div></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">{metrics.map(([label, count]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{count}</p></section>)}</div><p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Laboratory scope only. Diagnosis, prescriptions, consultation changes, payments, pharmacy, radiology, insurance, and administration are unavailable.</p></div>
}
