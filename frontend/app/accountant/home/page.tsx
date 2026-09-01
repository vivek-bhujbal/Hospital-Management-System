import Link from 'next/link'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import type { AccountantDashboard } from '@/lib/accountantTypes'
import { money } from '@/lib/accountantTypes'

export default async function AccountantDashboardPage() {
  const data = await fetchAPI('/accountant/dashboard') as AccountantDashboard
  const metrics = [
    ['Today revenue', money(data.today_revenue)],
    ['Pending invoices', data.pending_invoices],
    ['Paid invoices', data.paid_invoices],
    ['Outstanding', money(data.outstanding_amount)],
    ["Today's payments", data.today_payments],
    ["Today's expenses", money(data.today_expenses)],
  ] as const
  return <div className="space-y-6"><AutoRefresh interval={30000}/><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Financial control</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Accountant Dashboard</h1><p className="mt-1 text-slate-600">Invoices, payments, expenses, reconciliation, and financial summaries.</p></div><div className="flex gap-2"><Link href="/accountant/invoices" className="rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white">Invoices</Link><Link href="/accountant/reports" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold text-slate-700">Reports</Link></div></div><div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">{metrics.map(([label, count]) => <section key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{count}</p></section>)}</div><section className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Financial summary</h2><div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[['Revenue', data.financial_summary.revenue], ['Expenses', data.financial_summary.expenses], ['Refunds', data.financial_summary.refunds], ['Outstanding', data.financial_summary.outstanding], ['Net', data.financial_summary.net]].map(([label, amount]) => <div key={label as string} className="rounded-xl bg-slate-50 p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-lg font-bold">{money(amount)}</p></div>)}</div></section><p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">Finance scope only. Diagnosis, prescriptions, clinical notes, nursing, lab, radiology, pharmacy, insurance claims, ambulance, employee permissions, and Admin security are unavailable.</p></div>
}
