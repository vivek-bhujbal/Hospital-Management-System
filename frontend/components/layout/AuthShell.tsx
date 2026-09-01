import Link from 'next/link'
import { Activity, HeartPulse, LockKeyhole, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  description: string
  eyebrow?: string
  children: ReactNode
  wide?: boolean
}

export default function AuthShell({ title, description, eyebrow = 'Secure care workspace', children, wide = false }: AuthShellProps) {
  return (
    <main id="main-content" className="hms-auth grid min-h-screen bg-[var(--hms-surface)] lg:grid-cols-[minmax(22rem,0.82fr)_minmax(34rem,1.18fr)]">
      <section className="relative hidden overflow-hidden bg-[var(--hms-sidebar)] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
        <div className="absolute inset-0 opacity-[0.07]" aria-hidden="true" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
        <div className="absolute -right-28 top-1/3 h-80 w-80 rounded-full border-[64px] border-emerald-300/10" aria-hidden="true" />
        <Link href="/" className="relative flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-brand-700"><HeartPulse className="h-6 w-6" /></span><span><span className="block text-lg font-bold tracking-tight">HMS Platform</span><span className="block text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-emerald-100/60">Healthcare operations</span></span></Link>
        <div className="relative max-w-md">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">Care without friction</p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.04em] xl:text-5xl">One secure workspace for every hospital team.</h2>
          <p className="mt-5 text-sm leading-7 text-emerald-50/70">Purpose-built workflows help clinical, operational, and administrative teams focus on the right information at the right time.</p>
          <div className="mt-8 grid gap-3">
            <div className="flex items-center gap-3 text-sm text-emerald-50/85"><ShieldCheck className="h-5 w-5 text-emerald-300" />Role-based access and protected health information</div>
            <div className="flex items-center gap-3 text-sm text-emerald-50/85"><Activity className="h-5 w-5 text-emerald-300" />Connected clinical and operational workflows</div>
            <div className="flex items-center gap-3 text-sm text-emerald-50/85"><LockKeyhole className="h-5 w-5 text-emerald-300" />Secure authentication and activity controls</div>
          </div>
        </div>
        <p className="relative text-xs text-emerald-100/50">Authorized access only · Patient privacy protected</p>
      </section>

      <section className="flex min-w-0 items-center justify-center bg-[var(--hms-bg)] px-4 py-10 sm:px-8 lg:px-12">
        <div className={wide ? 'w-full max-w-3xl' : 'w-full max-w-md'}>
          <Link href="/" className="mb-8 inline-flex items-center gap-2 text-brand-800 lg:hidden dark:text-brand-300"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800 text-white"><HeartPulse className="h-5 w-5" /></span><span className="font-bold">HMS Platform</span></Link>
          <header className="mb-7">
            <p className="hms-eyebrow">{eyebrow}</p>
            <h1 className="hms-page-title mt-2">{title}</h1>
            <p className="hms-page-description">{description}</p>
          </header>
          <div className="hms-card p-6 sm:p-8">{children}</div>
          <p className="mt-6 text-center text-xs leading-5 text-slate-500">By continuing, you acknowledge your organization’s privacy and security policies.</p>
        </div>
      </section>
    </main>
  )
}
