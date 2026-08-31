import Link from 'next/link'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import type { PharmacyDashboardData } from '@/lib/pharmacistTypes'
import { pharmacyStatusClass, pharmacyStatusLabel } from '@/lib/pharmacistTypes'

export default async function PharmacistDashboard() {
  const data = await fetchAPI('/pharmacy/dashboard') as PharmacyDashboardData
  const metrics = [
    ['Pending prescriptions', data.pending_prescriptions],
    ['Ready for dispensing', data.ready_for_dispensing],
    ['Low-stock medicines', data.low_stock_medicines],
    ['Out-of-stock medicines', data.out_of_stock_medicines],
    ["Today's dispensed", data.today_dispensed_medicines],
  ] as const
  return <div className="space-y-6">
    <AutoRefresh interval={30000} />
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Pharmacy operations</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Pharmacist Dashboard</h1><p className="mt-1 text-slate-600">Prescription review, safe dispensing, and inventory alerts.</p></div><div className="flex gap-2"><Link href="/pharmacist/prescriptions" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">Review prescriptions</Link><Link href="/pharmacist/dispensing" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Dispense</Link></div></div>
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">{metrics.map(([label, count]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{count}</p></section>)}</div>
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b p-5"><h2 className="text-xl font-semibold">Recent prescriptions</h2><Link href="/pharmacist/prescriptions" className="text-sm font-semibold text-blue-700">View all</Link></div>{data.recent_prescriptions.length === 0 ? <p className="p-8 text-slate-500">No prescriptions are waiting.</p> : <div className="divide-y">{data.recent_prescriptions.map(item => <Link key={item.id} href={`/pharmacist/prescriptions/${item.id}`} className="flex items-center justify-between gap-4 p-5 hover:bg-slate-50"><div><p className="font-semibold text-slate-900">{item.patient_name}</p><p className="mt-1 text-sm text-slate-500">{item.medicine || 'Medicine not specified'} · {item.doctor_name}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${pharmacyStatusClass(item.pharmacy_status)}`}>{pharmacyStatusLabel(item.pharmacy_status)}</span></Link>)}</div>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-semibold">Pharmacy alerts</h2><div className="mt-4 space-y-3"><div className="rounded-xl bg-red-50 p-4"><p className="text-sm text-red-700">Expired batches requiring action</p><p className="mt-1 text-2xl font-bold text-red-900">{data.alerts.expired_batches}</p></div><div className="rounded-xl bg-amber-50 p-4"><p className="text-sm text-amber-700">Rejected prescriptions</p><p className="mt-1 text-2xl font-bold text-amber-900">{data.alerts.rejected_prescriptions}</p></div></div><Link href="/pharmacist/inventory" className="mt-4 block text-sm font-semibold text-blue-700">Open inventory</Link></section>
    </div>
    <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Prescription clinical fields are read-only. Hospital billing, insurance, diagnosis, consultation, laboratory, and radiology functions are not available.</p>
  </div>
}
