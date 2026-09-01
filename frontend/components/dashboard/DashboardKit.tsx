import Link from 'next/link'
import { ArrowUpRight, LockKeyhole } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/components/ui/HmsUI'

export function QuickActions({ actions }: { actions: readonly { label: string; href: string; icon: LucideIcon; primary?: boolean }[] }) {
  return <section aria-labelledby="quick-actions-title"><div className="flex items-center justify-between"><h2 id="quick-actions-title" className="text-base font-semibold text-slate-900 dark:text-slate-50">Quick actions</h2><p className="text-xs text-slate-500">Common tasks</p></div><div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{actions.map(({ label, href, icon: Icon, primary }) => <Link key={href} href={href} className={cn('hms-card hms-card-interactive flex min-h-16 items-center gap-3 px-4 text-sm font-semibold', primary && 'border-brand-200 bg-brand-50/50 dark:border-brand-900 dark:bg-brand-950/20')}><span className={cn('rounded-lg p-2', primary ? 'bg-brand-700 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300')}><Icon className="h-4 w-4" /></span><span>{label}</span><ArrowUpRight className="ml-auto h-4 w-4 text-slate-400" /></Link>)}</div></section>
}

export function MetricBarList({ title, description, values, format = (value) => String(value) }: { title: string; description?: string; values: readonly { label: string; value: number; tone?: 'brand' | 'success' | 'warning' | 'danger' }[]; format?: (value: number) => string }) {
  const maximum = Math.max(1, ...values.map((item) => Math.abs(item.value)))
  const bars = { brand: 'bg-brand-600', success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500' }
  return <section className="hms-card p-5 sm:p-6"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>{description && <p className="mt-1 text-sm text-slate-500">{description}</p>}<div className="mt-5 space-y-4">{values.map((item) => <div key={item.label}><div className="mb-1.5 flex items-center justify-between gap-4 text-sm"><span className="font-medium text-slate-600 dark:text-slate-300">{item.label}</span><span className="font-semibold text-slate-900 dark:text-slate-100">{format(item.value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={cn('h-full rounded-full transition-[width] duration-500', bars[item.tone || 'brand'])} style={{ width: `${Math.max(item.value === 0 ? 0 : 5, Math.abs(item.value) / maximum * 100)}%` }} /></div></div>)}</div></section>
}

export function SectionCard({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={cn('hms-card overflow-hidden', className)}><header className="flex items-center justify-between gap-4 border-b px-5 py-4"><h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>{action}</header>{children}</section>
}

export function ScopeNotice({ children }: { children: ReactNode }) {
  return <aside className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50/65 p-4 text-sm leading-6 text-brand-900 dark:border-brand-900 dark:bg-brand-950/30 dark:text-brand-200"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" /><p>{children}</p></aside>
}
