import Link from 'next/link'
import { Activity, Building2, Settings, ShieldCheck, ShieldPlus, Users } from 'lucide-react'

import { QuickActions, SectionCard } from '@/components/dashboard/DashboardKit'
import { EmptyState, PageHeader, StatCard, StatusBadge } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'

interface ActivitySummary { id: number; actor_user_id: number | null; action: string; resource_type: string; resource_id: string | null; created_at: string }
interface PlatformOverview {
  total_organizations: number; total_admins: number; active_admins: number; total_users: number
  role_permission_grants: number; system_settings: number; feature_flags: number
  recent_activity: ActivitySummary[]
  health: { backend: string; database: string; redis: string; checked_at: string }
}

export default async function SuperAdminDashboard() {
  const overview = await fetchAPI('/super-admin/overview') as PlatformOverview
  return <div className="space-y-7">
    <PageHeader eyebrow="System control center" title="Platform overview" description="Global organizations, administrators, access governance, activity, and platform health." />
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Platform key performance indicators">
      <StatCard label="Organizations" value={overview.total_organizations} icon={Building2} href="/super-admin/hospitals" />
      <StatCard label="Administrators" value={overview.total_admins} icon={ShieldPlus} href="/super-admin/admins" tone="info" />
      <StatCard label="Active admins" value={overview.active_admins} icon={ShieldCheck} href="/super-admin/admins" tone="success" />
      <StatCard label="System users" value={overview.total_users} icon={Users} href="/super-admin/users" />
      <StatCard label="Role grants" value={overview.role_permission_grants} icon={ShieldCheck} href="/super-admin/permissions" tone="warning" />
    </section>
    <QuickActions actions={[{ label: 'Create administrator', href: '/super-admin/admins', icon: ShieldPlus, primary: true }, { label: 'Manage hospitals', href: '/super-admin/hospitals', icon: Building2 }, { label: 'Access governance', href: '/super-admin/permissions', icon: ShieldCheck }, { label: 'System configuration', href: '/super-admin/settings', icon: Settings }]} />
    <div className="grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
      <SectionCard title="Recent system activity" action={<Link href="/super-admin/audit-logs" className="text-sm font-semibold text-brand-700 dark:text-brand-300">View audit logs</Link>}>
        {overview.recent_activity.length === 0 ? <EmptyState title="No audit activity yet" description="Administrative and security events will be recorded here." /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-5 py-3 text-left">Actor</th><th className="px-5 py-3 text-left">Action</th><th className="px-5 py-3 text-left">Resource</th><th className="px-5 py-3 text-left">Time</th></tr></thead><tbody className="divide-y">{overview.recent_activity.map((event) => <tr key={event.id}><td className="px-5 py-4">{event.actor_user_id ? `User #${event.actor_user_id}` : 'System'}</td><td className="px-5 py-4 font-semibold">{event.action}</td><td className="px-5 py-4">{event.resource_type}{event.resource_id ? ` #${event.resource_id}` : ''}</td><td className="whitespace-nowrap px-5 py-4">{new Date(event.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </SectionCard>
      <SectionCard title="System health" action={<Link href="/super-admin/system-health" className="text-sm font-semibold text-brand-700 dark:text-brand-300">Details</Link>}><div className="space-y-3 p-5"><p className="text-xs text-slate-500">Checked {new Date(overview.health.checked_at).toLocaleString()}</p>{(['backend', 'database', 'redis'] as const).map((service) => <div key={service} className="flex items-center justify-between rounded-xl border bg-[var(--hms-surface-muted)] p-3.5"><span className="flex items-center gap-2 font-medium capitalize"><Activity className="h-4 w-4 text-brand-700" />{service}</span><StatusBadge status={overview.health[service]} /></div>)}</div></SectionCard>
    </div>
  </div>
}
