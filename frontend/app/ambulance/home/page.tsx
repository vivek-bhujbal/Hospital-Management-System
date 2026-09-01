import Link from 'next/link'
import { AlertTriangle, Ambulance, ClipboardList, MapPinned, ShieldCheck } from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import { QuickActions, ScopeNotice, SectionCard } from '@/components/dashboard/DashboardKit'
import { EmptyState, PageHeader, StatCard, StatusBadge, WorkflowStepper } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'
import type { AmbulanceDashboard } from '@/lib/ambulanceTypes'

export default async function AmbulanceDashboardPage() {
  const data = await fetchAPI('/ambulance/dashboard') as AmbulanceDashboard
  return <div className="space-y-7">
    <AutoRefresh interval={30000} />
    <PageHeader eyebrow="Emergency transport center" title="Ambulance operations" description="See urgent requests, assigned vehicles, active transport, and completed trips." />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Emergency transport key performance indicators">
      <StatCard label="Available ambulances" value={data.available_ambulances} icon={Ambulance} tone="success" />
      <StatCard label="Active trips" value={data.active_trips} icon={MapPinned} tone="info" />
      <StatCard label="Pending requests" value={data.pending_requests} icon={AlertTriangle} tone="danger" />
      <StatCard label="Assigned requests" value={data.assigned_requests} icon={ClipboardList} tone="warning" />
      <StatCard label="Completed trips" value={data.completed_trips} icon={ShieldCheck} tone="success" />
    </section>
    <QuickActions actions={[{ label: 'Emergency requests', href: '/ambulance/requests', icon: AlertTriangle, primary: true }, { label: 'Assigned trips', href: '/ambulance/trips', icon: MapPinned }, { label: 'Vehicle availability', href: '/ambulance/vehicles', icon: Ambulance }]} />
    <section className="hms-card p-5 sm:p-6"><h2 className="text-lg font-semibold">Transport workflow</h2><div className="mt-5"><WorkflowStepper steps={['Requested', 'Assigned', 'En route', 'Arrived', 'Transporting', 'Completed']} current={data.active_trips > 0 ? 3 : data.assigned_requests > 0 ? 1 : data.completed_trips > 0 ? 5 : 0} /></div></section>
    <SectionCard title="Emergency alerts"><div className="border-t-2 border-rose-500">{data.emergency_alerts.length === 0 ? <EmptyState title="No urgent transport alerts" description="Critical and high-priority requests will be surfaced here immediately." /> : <div className="divide-y">{data.emergency_alerts.map((item) => <Link key={item.id} href={`/ambulance/requests/${item.id}`} className="flex flex-col gap-3 p-5 hover:bg-rose-50/60 dark:hover:bg-rose-950/20 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900 dark:text-slate-100">Request #{item.id} · {item.patient_name || 'Unknown patient'}</p><p className="mt-1 text-sm text-slate-500">{item.pickup_location} → {item.destination || 'Destination not recorded'}</p></div><StatusBadge status={item.status} /></Link>)}</div>}</div></SectionCard>
    <ScopeNotice>Transport scope only. Clinical history, prescriptions, diagnostics, billing, accounting, claims, employee management, and hospital administration remain unavailable.</ScopeNotice>
  </div>
}
