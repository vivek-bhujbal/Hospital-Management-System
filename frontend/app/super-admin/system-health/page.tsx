import { fetchAPI } from '@/lib/api'
import { Activity, Database, Server, TimerReset } from 'lucide-react'
import { PageHeader, StatusBadge } from '@/components/ui/HmsUI'

interface SystemHealth {
  backend: string
  database: string
  redis: string
  checked_at: string
}

export default async function SuperAdminHealth() {
  const health = await fetchAPI('/super-admin/system-health') as SystemHealth
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Platform operations" title="System health" description="Live service availability reported by the backend health monitor." />
      <div className="grid gap-5 md:grid-cols-3">
        {(['backend', 'database', 'redis'] as const).map((service, index) => { const Icon = [Server, Database, TimerReset][index]; return (
          <section key={service} className="hms-card hms-card-interactive p-5 transition-all">
            <div className="flex items-start justify-between"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><Icon className="h-5 w-5" /></span><StatusBadge status={health[service]} /></div>
            <p className="mt-5 text-lg font-bold capitalize text-slate-900 dark:text-slate-50">{service}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Live availability check</p>
          </section>
        )})}
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Activity className="h-4 w-4 text-brand-600" />Last checked {new Date(health.checked_at).toLocaleString()}</div>
    </div>
  )
}
