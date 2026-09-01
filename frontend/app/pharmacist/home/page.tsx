import Link from 'next/link'
import { AlertTriangle, ClipboardList, PackageSearch, Pill, ShieldCheck } from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import { QuickActions, ScopeNotice, SectionCard } from '@/components/dashboard/DashboardKit'
import { EmptyState, PageHeader, StatCard, StatusBadge, WorkflowStepper } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'
import type { PharmacyDashboardData } from '@/lib/pharmacistTypes'

export default async function PharmacistDashboard() {
  const data = await fetchAPI('/pharmacy/dashboard') as PharmacyDashboardData
  return <div className="space-y-7">
    <AutoRefresh interval={30000} />
    <PageHeader eyebrow="Pharmacy management center" title="Pharmacy overview" description="Review prescriptions, dispense safely, and act on inventory risk." />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Pharmacy key performance indicators">
      <StatCard label="Pending prescriptions" value={data.pending_prescriptions} icon={ClipboardList} tone="warning" />
      <StatCard label="Ready to dispense" value={data.ready_for_dispensing} icon={Pill} tone="info" />
      <StatCard label="Low stock" value={data.low_stock_medicines} icon={PackageSearch} tone="warning" />
      <StatCard label="Out of stock" value={data.out_of_stock_medicines} icon={AlertTriangle} tone="danger" />
      <StatCard label="Dispensed today" value={data.today_dispensed_medicines} icon={ShieldCheck} tone="success" />
    </section>
    <QuickActions actions={[{ label: 'Review prescriptions', href: '/pharmacist/prescriptions', icon: ClipboardList, primary: true }, { label: 'Dispensing workspace', href: '/pharmacist/dispensing', icon: Pill }, { label: 'Medicine inventory', href: '/pharmacist/inventory', icon: PackageSearch }]} />
    <section className="hms-card p-5 sm:p-6"><h2 className="text-lg font-semibold">Safe dispensing workflow</h2><div className="mt-5"><WorkflowStepper steps={['Prescription', 'Verification', 'Availability', 'Dispensing', 'Inventory update', 'Completed']} current={data.ready_for_dispensing > 0 ? 2 : data.today_dispensed_medicines > 0 ? 5 : data.pending_prescriptions > 0 ? 0 : 0} /></div></section>
    <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
      <SectionCard title="Recent prescriptions" action={<Link href="/pharmacist/prescriptions" className="text-sm font-semibold text-brand-700 dark:text-brand-300">View all</Link>}>
        {data.recent_prescriptions.length === 0 ? <EmptyState title="No prescriptions waiting" description="New prescriptions assigned to pharmacy will appear here." /> : <div className="divide-y">{data.recent_prescriptions.map((item) => <Link key={item.id} href={`/pharmacist/prescriptions/${item.id}`} className="flex flex-col gap-3 p-5 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900 dark:text-slate-100">{item.patient_name}</p><p className="mt-1 text-sm text-slate-500">{item.medicine || 'Medicine not specified'} · Dr. {item.doctor_name}</p></div><StatusBadge status={item.pharmacy_status} /></Link>)}</div>}
      </SectionCard>
      <SectionCard title="Inventory alerts"><div className="grid gap-3 p-5"><div className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950"><p className="text-sm text-rose-700 dark:text-rose-300">Expired batches</p><p className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">{data.alerts.expired_batches}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950"><p className="text-sm text-amber-700 dark:text-amber-300">Rejected prescriptions</p><p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-100">{data.alerts.rejected_prescriptions}</p></div></div></SectionCard>
    </div>
    <ScopeNotice>Prescription clinical fields are read-only. Diagnosis, consultation, hospital billing, insurance, laboratory, and imaging functions remain unavailable.</ScopeNotice>
  </div>
}
