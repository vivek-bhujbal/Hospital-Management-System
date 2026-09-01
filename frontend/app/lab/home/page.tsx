import { AlertTriangle, ClipboardList, FlaskConical, Microscope, TestTube2 } from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import { QuickActions, ScopeNotice } from '@/components/dashboard/DashboardKit'
import { PageHeader, StatCard, WorkflowStepper } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'
import type { LabDashboard } from '@/lib/labTypes'

export default async function LabDashboardPage() {
  const data = await fetchAPI('/lab/dashboard') as LabDashboard
  return <div className="space-y-7">
    <AutoRefresh interval={30000} />
    <PageHeader eyebrow="Laboratory operations center" title="Laboratory overview" description="Track authorized orders from collection through verified results." />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6" aria-label="Laboratory key performance indicators">
      <StatCard label="Pending orders" value={data.pending_lab_orders} icon={ClipboardList} tone="warning" />
      <StatCard label="Samples collected" value={data.samples_collected} icon={TestTube2} tone="info" />
      <StatCard label="In processing" value={data.tests_in_progress} icon={Microscope} tone="info" />
      <StatCard label="Completed tests" value={data.completed_tests} icon={FlaskConical} tone="success" />
      <StatCard label="Urgent tests" value={data.urgent_tests} icon={AlertTriangle} tone="danger" />
      <StatCard label="Today’s workload" value={data.today_workload} icon={ClipboardList} />
    </section>
    <QuickActions actions={[{ label: 'Open lab orders', href: '/lab/orders', icon: FlaskConical, primary: true }, { label: 'Results workspace', href: '/lab/results', icon: TestTube2 }]} />
    <section className="hms-card p-5 sm:p-6"><h2 className="text-lg font-semibold">Laboratory workflow</h2><p className="mt-1 text-sm text-slate-500">Every specimen remains visible through its processing lifecycle.</p><div className="mt-5"><WorkflowStepper steps={['Ordered', 'Sample collection', 'Processing', 'Result entry', 'Verification', 'Completed']} current={data.tests_in_progress > 0 ? 2 : data.samples_collected > 0 ? 1 : data.completed_tests > 0 ? 5 : 0} /></div></section>
    <ScopeNotice>Laboratory scope only. Diagnosis, consultation changes, prescriptions, payments, pharmacy, imaging, insurance, and administration remain unavailable.</ScopeNotice>
  </div>
}
