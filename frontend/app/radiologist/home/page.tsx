import Link from 'next/link'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import type { RadiologyDashboard } from '@/lib/radiologistTypes'

export default async function RadiologistDashboardPage() {
  const data = await fetchAPI('/radiology/dashboard') as RadiologyDashboard
  const metrics = [['Pending imaging orders', data.pending_imaging_orders], ['Scheduled imaging', data.scheduled_imaging], ['Awaiting interpretation', data.studies_awaiting_interpretation], ['Reports pending', data.reports_pending], ['Completed reports', data.completed_reports], ['Urgent cases', data.urgent_cases]] as const
  return <div className="space-y-6"><AutoRefresh interval={30000}/><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Diagnostic imaging</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Radiologist Dashboard</h1><p className="mt-1 text-slate-600">Authorized imaging studies, interpretation queue, and report status.</p></div><div className="flex gap-2"><Link href="/radiologist/orders" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Imaging orders</Link><Link href="/radiologist/reports" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">Reports</Link></div></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">{metrics.map(([label, count]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{count}</p></section>)}</div><p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Radiology scope only. Laboratory, prescriptions, consultation mutation, pharmacy, billing, accounting, insurance, ambulance, reception, and administration are unavailable.</p></div>
}
