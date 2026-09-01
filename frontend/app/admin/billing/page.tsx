import { CircleDollarSign, ReceiptText } from 'lucide-react'
import AutoRefresh from '@/components/AutoRefresh'
import { EmptyState, PageHeader, StatCard, StatusBadge } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'

interface Transaction { id: number; created_at: string; patient_id: number; amount: number | string; status: string; payment_method: string | null; receipt_no: string | null }
interface BillingReport { paid_total: number; pending_total: number; recent_transactions: Transaction[] }

export default async function AdminBilling() {
  const report = await fetchAPI('/admin/billing/report') as BillingReport
  const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
  return <div className="space-y-6"><AutoRefresh interval={5000} />
    <PageHeader eyebrow="Revenue cycle" title="Financial overview" description="Monitor collected revenue, outstanding dues, and recent hospital transactions." />
    <div className="grid gap-4 md:grid-cols-2"><StatCard label="Total collected revenue" value={money.format(report.paid_total)} icon={CircleDollarSign} tone="success" helper="Successfully received" /><StatCard label="Pending dues" value={money.format(report.pending_total)} icon={ReceiptText} tone="warning" helper="Awaiting collection" /></div>
    <section className="hms-card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-slate-50">Recent transactions</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">Newest invoice and payment activity</p></div>{report.recent_transactions.length === 0 ? <EmptyState title="No transactions yet" description="Recorded billing activity will appear here." /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Patient</th><th className="px-5 py-3 text-left">Amount</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Method</th><th className="px-5 py-3 text-left">Receipt</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{report.recent_transactions.map(item => <tr key={item.id}><td className="whitespace-nowrap px-5 py-4">{new Date(item.created_at).toLocaleDateString('en-IN')}</td><td className="px-5 py-4 font-semibold">#{item.patient_id}</td><td className="px-5 py-4 font-semibold">{money.format(Number(item.amount))}</td><td className="px-5 py-4"><StatusBadge status={item.status} /></td><td className="px-5 py-4 capitalize">{item.payment_method || '—'}</td><td className="px-5 py-4 font-mono text-xs text-slate-500">{item.receipt_no || '—'}</td></tr>)}</tbody></table></div>}</section>
  </div>
}
