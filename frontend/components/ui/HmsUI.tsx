import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { AlertTriangle, Inbox, LoaderCircle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        {eyebrow && <p className="hms-eyebrow">{eyebrow}</p>}
        <h1 className="hms-page-title mt-1">{title}</h1>
        {description && <p className="hms-page-description">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

interface StatCardProps {
  label: string
  value: ReactNode
  icon?: LucideIcon
  helper?: string
  href?: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

const toneClasses = {
  default: 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
}

export function StatCard({ label, value, icon: Icon, helper, href, tone = 'default' }: StatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
        {Icon && <span className={cn('rounded-lg p-2', toneClasses[tone])}><Icon aria-hidden="true" className="h-4 w-4" /></span>}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
      {helper && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helper}</p>}
    </>
  )

  return href ? (
    <Link href={href} className="hms-card hms-card-interactive block p-5">{body}</Link>
  ) : (
    <section className="hms-card p-5">{body}</section>
  )
}

const statusTone = (status: string) => {
  const value = status.toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
  if (['completed', 'paid', 'approved', 'active', 'available', 'verified', 'dispensed', 'settled'].includes(value)) return 'success'
  if (['pending', 'requested', 'scheduled', 'waiting', 'sample_pending', 'documents_required'].includes(value)) return 'warning'
  if (['cancelled', 'canceled', 'rejected', 'failed', 'inactive', 'expired', 'out_of_stock'].includes(value)) return 'danger'
  if (['processing', 'in_progress', 'checked_in', 'submitted', 'under_review', 'assigned'].includes(value)) return 'info'
  return 'neutral'
}

const badgeClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
  info: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export function StatusBadge({ status }: { status: string }) {
  const tone = statusTone(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize', badgeClasses[tone])}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replaceAll('_', ' ')}
    </span>
  )
}

interface StateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ title, description, action }: StateProps) {
  return (
    <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-4 rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><Inbox aria-hidden="true" className="h-6 w-6" /></span>
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function ErrorState({ title, description, action }: StateProps) {
  return (
    <div role="alert" className="hms-card flex min-h-56 flex-col items-center justify-center border-rose-200 px-6 py-12 text-center dark:border-rose-900">
      <span className="mb-4 rounded-full bg-rose-50 p-3 text-rose-600 dark:bg-rose-950 dark:text-rose-300"><AlertTriangle aria-hidden="true" className="h-6 w-6" /></span>
      <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
      <p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Loading workspace' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400">
        <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-brand-700 dark:text-brand-300" />
        <span>{label}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => <div key={item} className="hms-skeleton h-28 rounded-2xl" />)}
      </div>
      <div className="hms-skeleton h-72 rounded-2xl" />
    </div>
  )
}

export function RetryButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="hms-button hms-button-primary"><RefreshCw className="h-4 w-4" />Try again</button>
}

export function WorkflowStepper({ steps, current }: { steps: readonly string[]; current: number }) {
  return (
    <ol aria-label="Workflow progress" className="grid gap-2 sm:grid-flow-col sm:auto-cols-fr">
      {steps.map((step, index) => {
        const complete = index < current
        const active = index === current
        return (
          <li key={step} aria-current={active ? 'step' : undefined} className="relative flex items-center gap-3 rounded-xl border bg-white p-3 dark:bg-slate-900">
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold', complete || active ? 'bg-brand-700 text-white dark:bg-brand-500' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400')}>{complete ? '✓' : index + 1}</span>
            <span className={cn('text-xs font-semibold', active ? 'text-brand-800 dark:text-brand-300' : 'text-slate-600 dark:text-slate-300')}>{step}</span>
          </li>
        )
      })}
    </ol>
  )
}
