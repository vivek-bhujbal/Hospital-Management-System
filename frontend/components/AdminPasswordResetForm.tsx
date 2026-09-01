'use client'

import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react'

import { resetAdminPasswordAction } from '@/app/actions/superAdmin'
import SubmitButton from '@/components/SubmitButton'

export default function AdminPasswordResetForm({ adminId }: { adminId: number }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await resetAdminPasswordAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    formRef.current?.reset()
    setSuccess('Administrator password reset successfully.')
  }

  return (
    <section className="hms-card max-w-3xl overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300"><KeyRound className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Reset password</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set a temporary password and share it through a secure channel.</p></div></div>

      <form ref={formRef} action={submit} className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <input type="hidden" name="id" value={adminId} />
        <div>
          <label htmlFor="new_password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            New password
          </label>
          <input
            id="new_password"
            name="new_password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="hms-input"
          />
        </div>
        <div>
          <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
            Confirm new password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="hms-input"
          />
        </div>

        <p className="sm:col-span-2 text-xs text-slate-500 dark:text-slate-400">
          Use at least 8 characters with uppercase, lowercase, a number, and a special character.
        </p>
        <div aria-live="polite" className="sm:col-span-2">
          {error && <p className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p>}
          {success && <p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{success}</p>}
        </div>
        <div className="sm:col-span-2">
          <SubmitButton>Reset password</SubmitButton>
        </div>
      </form>
    </section>
  )
}
