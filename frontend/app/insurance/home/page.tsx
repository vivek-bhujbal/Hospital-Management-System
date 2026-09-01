import { BadgeCheck, ClipboardCheck, FileHeart, FileWarning, ShieldCheck } from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import { MetricBarList, QuickActions, ScopeNotice } from '@/components/dashboard/DashboardKit'
import { PageHeader, StatCard, WorkflowStepper } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'
import type { InsuranceDashboard } from '@/lib/insuranceTypes'
import { insuranceMoney } from '@/lib/insuranceTypes'

export default async function InsuranceDashboardPage() {
  const data = await fetchAPI('/insurance/dashboard') as InsuranceDashboard
  return <div className="space-y-7">
    <AutoRefresh interval={30000} />
    <PageHeader eyebrow="Insurance and claims center" title="Claims overview" description="Verify coverage, progress claims, resolve documentation, and track decisions." />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Claims key performance indicators">
      <StatCard label="Pending claims" value={data.pending_claims} icon={ClipboardCheck} tone="warning" />
      <StatCard label="Under review" value={data.claims_under_review} icon={ShieldCheck} tone="info" />
      <StatCard label="Approved" value={data.approved_claims} icon={BadgeCheck} tone="success" />
      <StatCard label="Rejected" value={data.rejected_claims} icon={FileWarning} tone="danger" />
      <StatCard label="Documents required" value={data.claims_requiring_documents} icon={FileHeart} tone="warning" />
    </section>
    <QuickActions actions={[{ label: 'Review claims', href: '/insurance/claims', icon: ClipboardCheck, primary: true }, { label: 'Approval queue', href: '/insurance/approvals', icon: BadgeCheck }, { label: 'Verify patient policies', href: '/insurance/patients', icon: ShieldCheck }]} />
    <section className="hms-card p-5 sm:p-6"><h2 className="text-lg font-semibold">Claim lifecycle</h2><p className="mt-1 text-sm text-slate-500">A consistent path from verified policy to settlement.</p><div className="mt-5"><WorkflowStepper steps={['Insurance info', 'Claim created', 'Submitted', 'Processing', 'Decision', 'Settlement']} current={Math.min(5, data.approved_claims > 0 ? 4 : data.claims_under_review > 0 ? 3 : data.pending_claims > 0 ? 2 : 0)} /></div></section>
    <MetricBarList title="Claim value summary" values={[{ label: 'Total claimed', value: Number(data.total_claimed_amount), tone: 'brand' }, { label: 'Approved amount', value: Number(data.approved_amount), tone: 'success' }]} format={insuranceMoney} />
    <ScopeNotice>Insurance scope only. Clinical records, consultation changes, diagnostics, pharmacy, transport, general payments, and staff administration remain unavailable.</ScopeNotice>
  </div>
}
