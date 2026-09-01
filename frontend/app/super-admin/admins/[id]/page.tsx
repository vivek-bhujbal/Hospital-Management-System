import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CalendarDays, IdCard, Mail, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'

import { fetchAPI } from '@/lib/api'
import AdminPasswordResetForm from '@/components/AdminPasswordResetForm'
import { PageHeader, StatusBadge } from '@/components/ui/HmsUI'

interface AdminDetail { id: number; name: string; email: string; role: 'admin'; is_active: boolean; created_at: string }

export default async function SuperAdminAdminDetail({ params }: { params: { id: string } }) {
  let account: AdminDetail
  try { account = await fetchAPI(`/super-admin/admins/${params.id}`) as AdminDetail } catch (error) { if (error instanceof Error && error.message.includes('404')) notFound(); throw error }

  const details: Array<[LucideIcon, string, string]> = [
    [Mail, 'Email address', account.email], [ShieldCheck, 'Assigned role', account.role],
    [IdCard, 'User ID', `#${account.id}`], [CalendarDays, 'Created', new Date(account.created_at).toLocaleString()],
  ]

  return <div className="space-y-6">
    <Link href="/super-admin/admins" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:text-brand-900 dark:text-brand-300"><ArrowLeft className="h-4 w-4" />Back to administrators</Link>
    <PageHeader eyebrow="Administrator management" title="Administrator profile" description="Review account identity, access state, and security controls." />
    <section className="hms-card max-w-4xl overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-200 bg-gradient-to-r from-brand-50/80 to-transparent px-5 py-6 dark:border-slate-800 dark:from-brand-950/50 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-4"><span className="rounded-2xl bg-brand-700 p-3 text-white shadow-sm"><UserRound className="h-6 w-6" /></span><div><h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">{account.name}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Hospital administrator</p></div></div><StatusBadge status={account.is_active ? 'Active' : 'Disabled'} /></div>
      <dl className="grid gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-2">{details.map(([Icon, label, value]) => <div key={label} className="bg-white p-5 dark:bg-slate-950"><dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"><Icon className="h-4 w-4 text-brand-600" />{label}</dt><dd className="mt-2 break-words font-semibold capitalize text-slate-900 dark:text-slate-100">{value}</dd></div>)}</dl>
      <p className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200 sm:m-6">Organization assignment remains intentionally unassigned until the staged organization-scoping migration is available.</p>
    </section>
    <AdminPasswordResetForm adminId={account.id} />
  </div>
}
