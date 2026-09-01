import { AlertTriangle, ClipboardList, FileCheck2, ScanLine } from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import { QuickActions, ScopeNotice } from '@/components/dashboard/DashboardKit'
import { PageHeader, StatCard, WorkflowStepper } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'
import type { RadiologyDashboard } from '@/lib/radiologistTypes'

export default async function RadiologistDashboardPage() {
  const data = await fetchAPI('/radiology/dashboard') as RadiologyDashboard
  return <div className="space-y-7">
    <AutoRefresh interval={30000} />
    <PageHeader eyebrow="Radiology center" title="Diagnostic imaging overview" description="Manage authorized imaging studies, interpretation queues, and final reports." />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Radiology key performance indicators">
      <StatCard label="Pending orders" value={data.pending_imaging_orders} icon={ClipboardList} tone="warning" />
      <StatCard label="Scheduled" value={data.scheduled_imaging} icon={ScanLine} tone="info" />
      <StatCard label="Awaiting interpretation" value={data.studies_awaiting_interpretation} icon={ScanLine} tone="warning" />
      <StatCard label="Reports pending" value={data.reports_pending} icon={FileCheck2} tone="info" />
      <StatCard label="Completed reports" value={data.completed_reports} icon={FileCheck2} tone="success" />
      <StatCard label="Urgent cases" value={data.urgent_cases} icon={AlertTriangle} tone="danger" />
    </section>
    <QuickActions actions={[{ label: 'Imaging order queue', href: '/radiologist/orders', icon: ScanLine, primary: true }, { label: 'Radiology reports', href: '/radiologist/reports', icon: FileCheck2 }]} />
    <section className="hms-card p-5 sm:p-6"><h2 className="text-lg font-semibold">Imaging workflow</h2><p className="mt-1 text-sm text-slate-500">Maintain a clear handoff from ordered study to verified report.</p><div className="mt-5"><WorkflowStepper steps={['Imaging order', 'Study', 'Interpretation', 'Report', 'Verification', 'Completed']} current={data.reports_pending > 0 ? 3 : data.studies_awaiting_interpretation > 0 ? 2 : data.completed_reports > 0 ? 5 : 0} /></div></section>
    <ScopeNotice>Radiology scope only. Laboratory, consultation mutation, prescriptions, pharmacy, finance, claims, transport, reception, and administration remain unavailable.</ScopeNotice>
  </div>
}
