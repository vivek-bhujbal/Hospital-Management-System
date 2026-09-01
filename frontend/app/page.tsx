import Link from 'next/link'
import { Activity, ArrowRight, CalendarCheck2, HeartPulse, ShieldCheck, Stethoscope, Users } from 'lucide-react'

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen bg-[var(--hms-bg)]">
      <header className="border-b bg-[var(--hms-surface)]">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-800 text-white"><HeartPulse className="h-5 w-5" /></span><span><span className="block text-sm font-bold tracking-tight text-slate-900">HMS Platform</span><span className="block text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-slate-500">Healthcare operations</span></span></Link>
          <Link href="/login" className="hms-button hms-button-primary">Sign in<ArrowRight className="h-4 w-4" /></Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:py-24">
        <div>
          <p className="hms-eyebrow">Connected hospital management</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-5xl lg:text-6xl">Better coordination for every moment of care.</h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">A secure, role-aware workspace for patients, clinical teams, front-desk operations, diagnostics, finance, insurance, and hospital leadership.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/login" className="hms-button hms-button-primary px-5">Open your workspace<ArrowRight className="h-4 w-4" /></Link><Link href="/register" className="hms-button hms-button-secondary px-5">Create patient account</Link></div>
          <p className="mt-5 flex items-center gap-2 text-xs font-medium text-slate-500"><ShieldCheck className="h-4 w-4 text-brand-700" />Secure access · Role-based permissions · Privacy-conscious workflows</p>
        </div>

        <div className="relative">
          <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-brand-100/60 blur-2xl" aria-hidden="true" />
          <section className="hms-card overflow-hidden p-4 sm:p-6" aria-label="Hospital operations overview">
            <div className="flex items-center justify-between border-b pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700">Care coordination</p><h2 className="mt-1 text-lg font-semibold text-slate-900">A calmer operational view</h2></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Activity className="h-5 w-5" /></span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[{ icon: CalendarCheck2, title: 'Patient flow', text: 'Appointments, check-ins, and consultations remain connected.' }, { icon: Stethoscope, title: 'Clinical work', text: 'Relevant patient context stays clear and actionable.' }, { icon: Users, title: 'Role-aware teams', text: 'Each team sees only the tools needed for its work.' }, { icon: ShieldCheck, title: 'Secure by design', text: 'Backend authorization remains the source of truth.' }].map(({ icon: Icon, title, text }) => <article key={title} className="rounded-xl border bg-[var(--hms-surface-muted)] p-4"><Icon className="h-5 w-5 text-brand-700" /><h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></article>)}
            </div>
          </section>
        </div>
      </section>

      <footer className="border-t bg-[var(--hms-surface)]"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><p>© {new Date().getFullYear()} HMS Platform</p><p>Professional hospital operations and patient care management</p></div></footer>
    </main>
  )
}
