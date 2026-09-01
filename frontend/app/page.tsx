import Link from 'next/link'
import { ArrowRight, Building2, Check, ChevronRight, HeartPulse, LockKeyhole, ShieldCheck, Stethoscope } from 'lucide-react'
import { HospitalDesktop } from '@/components/landing/HospitalDesktop'

const platformPillars = [
  {
    icon: Stethoscope,
    tag: 'Clinical intelligence',
    title: 'Connected clinical work',
    text: 'Patient context, consultations, diagnostics, and prescriptions stay connected across care teams.',
  },
  {
    icon: Building2,
    tag: 'Unified operations',
    title: 'One operational picture',
    text: 'Front desk, finance, insurance, pharmacy, and leadership work from the same reliable information.',
  },
  {
    icon: LockKeyhole,
    tag: 'Trusted access',
    title: 'Access built around roles',
    text: 'Every workspace is focused, permission-aware, and backed by server-side authorization.',
  },
]

const teams = ['Patients', 'Doctors', 'Nursing', 'Diagnostics', 'Pharmacy', 'Operations', 'Finance']

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen overflow-hidden bg-[var(--hms-bg)]">
      <header className="relative z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="group flex items-center gap-3" aria-label="HMS Platform home">
            <span className="flex h-11 w-11 items-center justify-center rounded-[0.9rem] bg-brand-800 text-white shadow-[0_8px_20px_rgba(13,95,84,0.18)] transition-transform duration-200 group-hover:-translate-y-0.5">
              <HeartPulse className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-[0.95rem] font-bold tracking-[-0.02em] text-slate-950">HMS Platform</span>
              <span className="mt-0.5 block text-[0.6rem] font-bold uppercase tracking-[0.19em] text-slate-500">Healthcare operations</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs font-semibold text-slate-500 md:flex">
              <ShieldCheck className="h-4 w-4 text-brand-700" />
              Secure role-based access
            </span>
            <Link href="/login" className="hms-button hms-button-primary px-5">
              Sign in
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative border-b border-emerald-200/10 bg-[#082b29]">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_30%,rgba(18,84,76,0.94),transparent_34%),radial-gradient(circle_at_82%_22%,rgba(22,163,139,0.28),transparent_31%),linear-gradient(135deg,#071f1f_0%,#0a302d_48%,#0b3935_100%)]" />
          <div className="absolute -right-40 -top-48 h-[38rem] w-[38rem] rounded-full bg-brand-400/15 blur-3xl" />
          <div className="absolute -bottom-56 left-[36%] h-[34rem] w-[34rem] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.11] [background-image:linear-gradient(to_right,#8edccd_1px,transparent_1px),linear-gradient(to_bottom,#8edccd_1px,transparent_1px)] [background-size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />
        </div>

        <div className="relative mx-auto grid min-w-0 max-w-[86rem] items-center gap-14 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14 lg:py-24">
          <div className="min-w-0 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/25 bg-white/[0.06] px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.13em] text-brand-200 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-300 shadow-[0_0_10px_rgba(110,231,203,0.75)]" />
              Connected hospital management
            </div>

            <h1 className="mt-6 text-[2.65rem] font-semibold leading-[1.04] tracking-[-0.052em] text-white sm:text-6xl lg:text-[4.15rem]">
              Every care team,
              <span className="block text-brand-300">working as one.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-emerald-50/70 sm:text-lg sm:leading-8">
              A secure hospital operations platform that brings patient care, clinical workflows, diagnostics, finance, and administration into one coordinated workspace.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="hms-button min-h-12 border-brand-300 bg-brand-300 px-6 text-brand-950 shadow-[0_10px_30px_rgba(52,211,178,0.22)] hover:-translate-y-0.5 hover:bg-brand-200">
                Open your workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/register" className="hms-button min-h-12 border-white/20 bg-white/[0.07] px-6 text-white backdrop-blur-sm hover:border-brand-300/50 hover:bg-white/[0.12]">Create patient account</Link>
            </div>

            <div className="mt-8 grid max-w-xl gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
              {['Privacy-conscious', 'Role-based', 'Care-focused'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs font-semibold text-emerald-50/70">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-brand-200"><Check className="h-3 w-3" strokeWidth={2.5} /></span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-w-0">
            <HospitalDesktop />
          </div>
        </div>
      </section>

      <section className="border-b border-brand-900/10 bg-[#dcece9]" aria-label="Platform teams">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-7 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex shrink-0 items-center gap-3">
            <span className="h-8 w-1 rounded-full bg-brand-700" />
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-brand-800">One connected ecosystem</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-600">Every team, one source of truth</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {teams.map((team, index) => (
              <span key={team} className="inline-flex items-center gap-2 rounded-full border border-brand-900/10 bg-white/65 px-3 py-1.5 text-[0.68rem] font-bold text-slate-700 shadow-[0_3px_12px_rgba(8,47,44,0.04)] backdrop-blur-sm">
                <span className={`h-1.5 w-1.5 rounded-full ${index % 3 === 0 ? 'bg-brand-600' : index % 3 === 1 ? 'bg-blue-500' : 'bg-amber-500'}`} />
                {team}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#102f31] px-5 py-16 sm:px-8 lg:py-24">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(19,184,154,0.2),transparent_30%),radial-gradient(circle_at_88%_74%,rgba(59,130,246,0.16),transparent_32%),linear-gradient(135deg,#0c292a_0%,#123438_52%,#102a34_100%)]" />
          <div className="absolute -left-48 top-16 h-96 w-96 rounded-full bg-brand-400/10 blur-3xl" />
          <div className="absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.09] [background-image:radial-gradient(#a7f3df_0.7px,transparent_0.7px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_86%)]" />
          <div className="absolute -right-24 top-10 h-56 w-[36rem] rotate-[-12deg] rounded-full border border-white/[0.04]" />
        </div>

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-300/20 bg-white/[0.07] px-3 py-1.5 text-[0.65rem] font-bold uppercase tracking-[0.13em] text-brand-200 shadow-sm backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-300 shadow-[0_0_8px_rgba(110,231,203,0.7)]" />
                Designed for modern care delivery
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl lg:text-[2.75rem]">Clarity where hospital work gets complex.</h2>
              <p className="mt-4 text-base leading-7 text-slate-300">Purpose-built workspaces help each team move faster without losing the shared context that coordinated care depends on.</p>
            </div>
            <div className="hidden max-w-xs items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.07] p-4 text-xs leading-5 text-slate-300 shadow-[0_14px_40px_rgba(0,0,0,0.12)] backdrop-blur-sm lg:flex">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-300 text-brand-950"><ShieldCheck className="h-4 w-4" /></span>
              Secure workflows designed around real hospital responsibilities.
            </div>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {platformPillars.map(({ icon: Icon, tag, title, text }, index) => (
              <article key={title} className={`group relative min-h-[20rem] overflow-hidden rounded-[1.35rem] border p-7 transition-all duration-300 hover:-translate-y-1.5 ${index === 0 ? 'border-brand-300/25 bg-[linear-gradient(145deg,#0e7565_0%,#09584f_52%,#073f3c_100%)] text-white shadow-[0_24px_55px_rgba(0,0,0,0.22)]' : index === 1 ? 'border-brand-300/25 bg-[linear-gradient(145deg,#dcf5ee_0%,#cbeae2_100%)] shadow-[0_20px_48px_rgba(0,0,0,0.16)] hover:border-brand-300/50' : 'border-blue-300/30 bg-[linear-gradient(145deg,#e3ecfa_0%,#d2e1f5_100%)] shadow-[0_20px_48px_rgba(0,0,0,0.16)] hover:border-blue-300/55'}`}>
                <div className={`absolute inset-x-0 top-0 h-1 ${index === 0 ? 'bg-brand-300' : index === 1 ? 'bg-brand-600' : 'bg-blue-600'}`} />
                <div className={`absolute -right-16 -top-16 h-40 w-40 rounded-full blur-2xl ${index === 0 ? 'bg-brand-300/15' : index === 1 ? 'bg-brand-200/45' : 'bg-blue-200/45'}`} aria-hidden="true" />
                <div className="flex items-start justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl border ${index === 0 ? 'border-white/10 bg-white/10 text-brand-200' : index === 1 ? 'border-brand-700/10 bg-white text-brand-700 shadow-sm' : 'border-blue-700/10 bg-white text-blue-700 shadow-sm'}`}><Icon className="h-5 w-5" /></span>
                  <span className={`text-xs font-bold ${index === 0 ? 'text-brand-200/60' : index === 1 ? 'text-brand-800/30' : 'text-blue-800/30'}`}>0{index + 1}</span>
                </div>
                <p className={`mt-8 text-[0.62rem] font-bold uppercase tracking-[0.12em] ${index === 0 ? 'text-brand-200' : index === 1 ? 'text-brand-700' : 'text-blue-700'}`}>{tag}</p>
                <h3 className={`mt-2 text-xl font-bold tracking-[-0.025em] ${index === 0 ? 'text-white' : 'text-slate-950'}`}>{title}</h3>
                <p className={`mt-3 text-sm leading-6 ${index === 0 ? 'text-emerald-50/70' : 'text-slate-600'}`}>{text}</p>
                <span className={`absolute bottom-7 left-7 inline-flex items-center gap-1.5 text-xs font-bold ${index === 0 ? 'text-brand-200' : index === 1 ? 'text-brand-800' : 'text-blue-800'}`}>Explore capability <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#041716]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-emerald-50/55 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2 font-semibold text-white"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-300 text-brand-950"><HeartPulse className="h-3.5 w-3.5" /></span>HMS Platform</div>
          <p>© {new Date().getFullYear()} HMS Platform. Professional hospital operations and patient care management.</p>
        </div>
      </footer>
    </main>
  )
}
