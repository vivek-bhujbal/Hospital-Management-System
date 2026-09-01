import Link from 'next/link'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import type { InsuranceDashboard } from '@/lib/insuranceTypes'
import { insuranceMoney } from '@/lib/insuranceTypes'

export default async function InsuranceDashboardPage() {
  const data = await fetchAPI('/insurance/dashboard') as InsuranceDashboard
  const metrics = [['Pending claims', data.pending_claims], ['Under review', data.claims_under_review], ['Approved claims', data.approved_claims], ['Rejected claims', data.rejected_claims], ['Documents required', data.claims_requiring_documents], ['Total claimed', insuranceMoney(data.total_claimed_amount)], ['Approved amount', insuranceMoney(data.approved_amount)]] as const
  return <div className="space-y-6"><AutoRefresh interval={30000}/><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Insurance operations</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Insurance Officer Dashboard</h1><p className="mt-1 text-slate-600">Policy verification, claims, document requirements, and decision tracking.</p></div><div className="flex gap-2"><Link href="/insurance/claims" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Claims</Link><Link href="/insurance/approvals" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">Approvals</Link></div></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-7">{metrics.map(([label, value]) => <section key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></section>)}</div><p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Insurance scope only. Clinical records, prescriptions, consultation, nursing, pharmacy, lab, radiology, ambulance, general payment collection, employee management, and hospital administration are unavailable.</p></div>
}
