'use client'

import { AlertCircle, ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole, Mail } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { loginAction } from '@/app/actions/auth'
import AuthShell from '@/components/layout/AuthShell'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [resendError, setResendError] = useState('')
  const [email, setEmail] = useState('')

  const handleResend = async () => {
    if (!email) return
    setResending(true)
    setResendMsg('')
    setResendError('')
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/resend-verification`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.detail || 'Unable to send the verification email.')
      setResendMsg(data.message || 'Verification email sent.')
    } catch (resendFailure) {
      setResendError(resendFailure instanceof Error ? resendFailure.message : 'Unable to send the verification email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResendMsg('')
    setResendError('')
    const formData = new FormData(event.currentTarget)
    setEmail(String(formData.get('email') || ''))
    const result = await loginAction(null, formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.redirectUrl) {
      router.push(result.redirectUrl)
    }
  }

  return (
    <AuthShell title="Welcome back" description="Sign in with your authorized hospital account. We’ll open the workspace assigned to your role.">
      {error && <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium">{error}</p>{error.toLowerCase().includes('verify your email') && <button type="button" onClick={handleResend} disabled={resending} className="mt-2 font-semibold underline underline-offset-2">{resending ? 'Sending…' : 'Resend verification email'}</button>}</div></div>}
      {resendMsg && <div role="status" className="mb-5 flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><p>{resendMsg}</p></div>}
      {resendError && <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{resendError}</p></div>}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <label htmlFor="email" className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Email address<span className="ml-1 text-rose-500" aria-hidden="true">*</span><span className="relative mt-2 block"><Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="email" name="email" type="email" autoComplete="email" required className="hms-input pl-10" placeholder="name@hospital.com" /></span></label>
        <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-200"><span className="flex items-center justify-between"><span>Password<span className="ml-1 text-rose-500" aria-hidden="true">*</span></span><Link href="/forgot-password" className="text-xs font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300">Forgot password?</Link></span><span className="relative mt-2 block"><LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input id="password" name="password" type="password" autoComplete="current-password" required className="hms-input pl-10" placeholder="Enter your password" /></span></label>
        <button type="submit" disabled={loading} className="hms-button hms-button-primary w-full">{loading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Signing in securely…</> : <>Sign in securely<ArrowRight className="h-4 w-4" /></>}</button>
      </form>

      <div className="mt-6 border-t pt-5 text-center text-sm text-slate-500">Need a patient account? <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300">Create one</Link></div>
    </AuthShell>
  )
}
