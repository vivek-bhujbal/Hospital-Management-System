'use client'

import {
  AlertCircle, ArrowRight, CalendarDays, Check, CheckCircle2, ChevronDown,
  Droplets, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, Phone, UserRound, UsersRound,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { registerAction } from '@/app/actions/auth'
import AuthShell from '@/components/layout/AuthShell'
import { Modal } from '@/components/ui/Modal'

const passwordChecks = [
  ['8+ characters', (value: string) => value.length >= 8],
  ['Upper & lowercase', (value: string) => /[A-Z]/.test(value) && /[a-z]/.test(value)],
  ['Number', (value: string) => /[0-9]/.test(value)],
  ['Special character', (value: string) => /[!@#$%^&*]/.test(value)],
] as const

const labelClass = 'block text-sm font-semibold text-slate-700 dark:text-slate-200'
const iconClass = 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400'

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData(event.currentTarget)
    const submittedPassword = String(formData.get('password') || '')
    const confirmPassword = String(formData.get('confirm_password') || '')

    if (submittedPassword !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }
    if (!passwordChecks.every(([, check]) => check(submittedPassword))) {
      setError('Create a stronger password that meets all four security requirements.')
      setLoading(false)
      return
    }

    const result = await registerAction(null, formData)
    if (result?.error) setError(result.error)
    else if (result?.success) setSuccess(true)
    setLoading(false)
  }

  return <>
    <AuthShell wide eyebrow="Patient self-service" title="Create your patient account" description="Register securely to manage appointments, prescriptions, bills, and your health profile from one place.">
      {error && <div role="alert" aria-live="polite" className="mb-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p className="font-medium">{error}</p></div>}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        <section aria-labelledby="personal-details-heading">
          <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><UserRound className="h-4 w-4" /></span><div><h2 id="personal-details-heading" className="text-sm font-bold text-slate-900 dark:text-slate-50">Personal details</h2><p className="text-xs text-slate-500 dark:text-slate-400">Use the same details shown on your hospital records.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="name" className={labelClass}>Full name<span className="ml-1 text-rose-500">*</span><span className="relative mt-2 block"><UserRound className={iconClass} /><input id="name" name="name" type="text" autoComplete="name" required className="hms-input pl-10" placeholder="Enter your full name" /></span></label>
            <label htmlFor="email" className={labelClass}>Email address<span className="ml-1 text-rose-500">*</span><span className="relative mt-2 block"><Mail className={iconClass} /><input id="email" name="email" type="email" autoComplete="email" required className="hms-input pl-10" placeholder="name@example.com" /></span></label>
            <label htmlFor="contact" className={labelClass}>Phone number<span className="ml-1 text-rose-500">*</span><span className="relative mt-2 block"><Phone className={iconClass} /><input id="contact" name="contact" type="tel" autoComplete="tel" required className="hms-input pl-10" placeholder="Enter your phone number" /></span></label>
            <label htmlFor="dob" className={labelClass}>Date of birth<span className="ml-1 text-rose-500">*</span><span className="relative mt-2 block"><CalendarDays className={iconClass} /><input id="dob" name="dob" type="date" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} required className="hms-input pl-10" /></span></label>
            <label htmlFor="gender" className={labelClass}>Gender<span className="ml-1 text-rose-500">*</span><span className="relative mt-2 block"><UsersRound className={iconClass} /><select id="gender" name="gender" required className="hms-input appearance-none pl-10 pr-10"><option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></span></label>
            <label htmlFor="blood_group" className={labelClass}>Blood group<span className="relative mt-2 block"><Droplets className={iconClass} /><select id="blood_group" name="blood_group" className="hms-input appearance-none pl-10 pr-10"><option value="">Select blood group</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(group => <option key={group} value={group}>{group}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /></span></label>
          </div>
        </section>

        <div className="border-t border-slate-200 dark:border-slate-800" />

        <section aria-labelledby="account-security-heading">
          <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><LockKeyhole className="h-4 w-4" /></span><div><h2 id="account-security-heading" className="text-sm font-bold text-slate-900 dark:text-slate-50">Account security</h2><p className="text-xs text-slate-500 dark:text-slate-400">Choose a unique password you do not use elsewhere.</p></div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label htmlFor="password" className={labelClass}>Password<span className="ml-1 text-rose-500">*</span><span className="relative mt-2 block"><LockKeyhole className={iconClass} /><input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} required className="hms-input pl-10 pr-11" placeholder="Create a secure password" /><button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800" aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
            <label htmlFor="confirm_password" className={labelClass}>Confirm password<span className="ml-1 text-rose-500">*</span><span className="relative mt-2 block"><CheckCircle2 className={iconClass} /><input id="confirm_password" name="confirm_password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required className="hms-input pl-10" placeholder="Enter the password again" /></span></label>
          </div>
          <div className="mt-4 grid gap-2 rounded-xl border bg-[var(--hms-surface-muted)] p-3 sm:grid-cols-2">{passwordChecks.map(([label, check]) => { const passed = check(password); return <div key={label} className={`flex items-center gap-2 text-xs font-medium ${passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}><span className={`flex h-4 w-4 items-center justify-center rounded-full ${passed ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-slate-200 dark:bg-slate-700'}`}>{passed && <Check className="h-3 w-3" />}</span>{label}</div> })}</div>
        </section>

        <button type="submit" disabled={loading} className="hms-button hms-button-primary w-full">{loading ? <><LoaderCircle className="h-4 w-4 animate-spin" />Creating your secure account…</> : <>Create patient account<ArrowRight className="h-4 w-4" /></>}</button>
      </form>

      <div className="mt-6 border-t pt-5 text-center text-sm text-slate-500">Already have an account? <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800 dark:text-brand-300">Sign in</Link></div>
    </AuthShell>

    <Modal open={success} title="Patient account created" description="One final security step is required before you can sign in." onClose={() => setSuccess(false)} size="sm">
      <div className="text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><CheckCircle2 className="h-7 w-7" /></span><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">We sent a verification link to your email address. Open it to activate your patient account.</p><Link href="/login" className="hms-button hms-button-primary mt-6 w-full">Continue to sign in<ArrowRight className="h-4 w-4" /></Link></div>
    </Modal>
  </>
}
