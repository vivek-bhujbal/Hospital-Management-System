import { BarChart3, CreditCard, ReceiptIndianRupee, WalletCards } from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import { MetricBarList, QuickActions, ScopeNotice } from '@/components/dashboard/DashboardKit'
import { PageHeader, StatCard } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'
import type { AccountantDashboard } from '@/lib/accountantTypes'
import { money } from '@/lib/accountantTypes'

export default async function AccountantDashboardPage() {
  const data = await fetchAPI('/accountant/dashboard') as AccountantDashboard
  const summary = data.financial_summary
  return <div className="space-y-7">
    <AutoRefresh interval={30000} />
    <PageHeader eyebrow="Financial management center" title="Financial overview" description="Monitor revenue, payments, expenses, reconciliation, and outstanding balances." />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Financial key performance indicators">
      <StatCard label="Today’s revenue" value={money(data.today_revenue)} icon={ReceiptIndianRupee} tone="success" />
      <StatCard label="Pending invoices" value={data.pending_invoices} icon={ReceiptIndianRupee} tone="warning" />
      <StatCard label="Paid invoices" value={data.paid_invoices} icon={CreditCard} tone="success" />
      <StatCard label="Outstanding" value={money(data.outstanding_amount)} icon={WalletCards} tone="danger" />
      <StatCard label="Today’s payments" value={data.today_payments} icon={CreditCard} tone="info" />
      <StatCard label="Today’s expenses" value={money(data.today_expenses)} icon={BarChart3} tone="warning" />
    </section>
    <QuickActions actions={[{ label: 'Review invoices', href: '/accountant/invoices', icon: ReceiptIndianRupee, primary: true }, { label: 'Payment directory', href: '/accountant/payments', icon: CreditCard }, { label: 'Record expenses', href: '/accountant/expenses', icon: WalletCards }, { label: 'Financial reports', href: '/accountant/reports', icon: BarChart3 }]} />
    <MetricBarList title="Financial summary" description="Current posted values from the accounting ledger." values={[{ label: 'Revenue', value: Number(summary.revenue), tone: 'success' }, { label: 'Expenses', value: Number(summary.expenses), tone: 'warning' }, { label: 'Refunds', value: Number(summary.refunds), tone: 'danger' }, { label: 'Outstanding', value: Number(summary.outstanding), tone: 'warning' }, { label: 'Net', value: Number(summary.net), tone: 'brand' }]} format={money} />
    <ScopeNotice>Finance scope only. Clinical notes, diagnosis, prescriptions, diagnostics, claims, transport, and staff security controls remain unavailable.</ScopeNotice>
  </div>
}
