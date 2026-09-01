'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CheckCircle2, ShieldPlus, UserRound } from 'lucide-react'

import { createAdminAccountAction } from '@/app/actions/staff'
import { setAdminActiveAction } from '@/app/actions/superAdmin'
import SubmitButton from '@/components/SubmitButton'
import { EmptyState, StatusBadge } from '@/components/ui/HmsUI'

export interface AccountSummary {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  profile_id: number | null
  created_at: string
}

export default function AdminAccountsPanel({ accounts }: { accounts: AccountSummary[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await createAdminAccountAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    formRef.current?.reset()
    setSuccess('Administrator created successfully.')
  }

  async function toggleStatus(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await setAdminActiveAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess('Administrator status updated.')
  }

  return (
    <div className="space-y-6">
      {(error || success) && <div role={error ? 'alert' : 'status'} aria-live="polite" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${error ? 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200'}`}>{error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}<span>{error || success}</span></div>}
      <section className="hms-card overflow-hidden">
        <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><ShieldPlus className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Create administrator</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Creates an active, verified Admin account. Super Admin access is never granted here.</p></div></div>
        <form ref={formRef} action={submit} className="grid gap-4 p-5 sm:p-6 md:grid-cols-3">
          <label><span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name</span><input name="name" autoComplete="name" required maxLength={100} placeholder="Administrator name" className="hms-input" /></label>
          <label><span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Email address</span><input name="email" autoComplete="email" required type="email" placeholder="admin@hospital.com" className="hms-input" /></label>
          <label><span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Temporary password</span><input name="password" autoComplete="new-password" required type="password" minLength={8} placeholder="Secure temporary password" className="hms-input" /></label>
          <p className="md:col-span-2 text-xs leading-5 text-slate-500 dark:text-slate-400">Use uppercase, lowercase, a number, and a special character. Share it securely; it is never returned by the API.</p>
          <div className="flex justify-end"><SubmitButton>Create administrator</SubmitButton></div>
        </form>
      </section>

      <section className="hms-card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-slate-50">Administrator directory</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{accounts.length} hospital administrator{accounts.length === 1 ? '' : 's'}</p></div>
        {accounts.length === 0 ? <EmptyState title="No administrators yet" description="Create the first hospital administrator using the secure form above." /> : <div className="overflow-x-auto"><table className="min-w-full text-sm">
          <thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th className="px-5 py-3.5">Administrator</th><th className="px-5 py-3.5">Email</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5">Created</th><th className="px-5 py-3.5">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">{accounts.map((account) => (
              <tr key={account.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/50">
                <td className="px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-full bg-brand-50 p-2 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><UserRound className="h-4 w-4" /></span><div><p className="font-semibold text-slate-900 dark:text-slate-50">{account.name}</p><p className="text-xs text-slate-500">ID #{account.id}</p></div></div></td>
                <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{account.email}</td>
                <td className="px-5 py-4"><StatusBadge status={account.is_active ? 'Active' : 'Disabled'} /></td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-500 dark:text-slate-400">{new Date(account.created_at).toLocaleString()}</td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/super-admin/admins/${account.id}`} className="hms-button hms-button-secondary">View details</Link>
                    <form action={toggleStatus}>
                      <input type="hidden" name="id" value={account.id} />
                      <input type="hidden" name="is_active" value={String(!account.is_active)} />
                      <SubmitButton className="hms-button hms-button-secondary">
                        {account.is_active ? 'Deactivate' : 'Activate'}
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}</tbody></table></div>}
      </section>
    </div>
  )
}
