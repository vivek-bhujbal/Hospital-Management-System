import Link from 'next/link'
import { ChevronLeft, ChevronRight, History } from 'lucide-react'

import { fetchAPI } from '@/lib/api'
import { EmptyState, PageHeader } from '@/components/ui/HmsUI'

interface AuditEvent {
  id: number
  actor_user_id: number | null
  action: string
  resource_type: string
  resource_id: string | null
  created_at: string
}

export default async function SuperAdminAuditLogs({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  const parsedPage = Number(searchParams?.page || '1')
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const limit = 25
  const events = await fetchAPI(`/super-admin/audit-logs?limit=${limit}&skip=${(page - 1) * limit}`) as AuditEvent[]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Security & compliance" title="Platform audit logs" description="Review immutable platform activity, ordered from newest to oldest." />
      <section className="hms-card overflow-hidden"><div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><History className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900 dark:text-slate-50">Activity ledger</h2><p className="text-sm text-slate-500 dark:text-slate-400">Page {page} · up to {limit} events</p></div></div>
        {events.length === 0 ? <EmptyState title="No audit events" description="There are no platform events recorded on this page." /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th className="px-5 py-3.5">Actor</th><th className="px-5 py-3.5">Action</th><th className="px-5 py-3.5">Resource</th><th className="px-5 py-3.5">Timestamp</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{events.map(event => <tr key={event.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/50"><td className="px-5 py-4 font-semibold text-slate-900 dark:text-slate-100">{event.actor_user_id ? `User #${event.actor_user_id}` : 'System'}</td><td className="px-5 py-4"><span className="rounded-md bg-brand-50 px-2 py-1 font-mono text-xs font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-300">{event.action}</span></td><td className="px-5 py-4 text-slate-600 dark:text-slate-300">{event.resource_type}{event.resource_id ? ` #${event.resource_id}` : ''}</td><td className="whitespace-nowrap px-5 py-4 text-slate-500 dark:text-slate-400">{new Date(event.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>}
      </section>
      <div className="flex items-center justify-between">
        {page > 1 ? <Link className="hms-button hms-button-secondary" href={`?page=${page - 1}`}><ChevronLeft className="h-4 w-4" />Previous</Link> : <span />}
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Page {page}</span>
        {events.length === limit ? <Link className="hms-button hms-button-secondary" href={`?page=${page + 1}`}>Next<ChevronRight className="h-4 w-4" /></Link> : <span />}
      </div>
    </div>
  )
}
