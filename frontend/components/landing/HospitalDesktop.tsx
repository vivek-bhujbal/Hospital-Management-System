import {
  Activity,
  BedDouble,
  Bell,
  CalendarDays,
  CheckCircle2,
  HeartPulse,
  LayoutDashboard,
  Search,
  ShieldCheck,
  Stethoscope,
  TestTube2,
  UsersRound,
  Zap,
} from 'lucide-react'

const navigation = [LayoutDashboard, UsersRound, CalendarDays, Stethoscope, TestTube2]

const patientFlow = [
  { time: '09:30', initials: 'AM', name: 'Aarav Mehta', care: 'Cardiology consultation', status: 'In care', tone: 'brand' },
  { time: '09:45', initials: 'SK', name: 'Sara Khan', care: 'Radiology review', status: 'Ready', tone: 'blue' },
  { time: '10:00', initials: 'RP', name: 'Riya Patel', care: 'General medicine', status: 'Checked in', tone: 'amber' },
]

const metrics = [
  { label: 'Appointments', value: '148', change: '+12.4%', icon: CalendarDays },
  { label: 'Active patients', value: '86', change: '+8.2%', icon: UsersRound },
  { label: 'Beds available', value: '24', change: '18% free', icon: BedDouble },
]

export function HospitalDesktop() {
  return (
    <div className="hms-desktop-stage relative mx-auto w-full max-w-[760px]" aria-label="Animated Hospital Management System desktop preview">
      <div className="hms-desktop-halo" aria-hidden="true" />
      <div className="hms-desktop-orbit hms-desktop-orbit-one" aria-hidden="true" />
      <div className="hms-desktop-orbit hms-desktop-orbit-two" aria-hidden="true" />

      <div className="hms-desktop-float">
        <section className="hms-desktop-window relative min-w-0 overflow-hidden" aria-label="Hospital operations command center">
          <div className="hms-desktop-shine" aria-hidden="true" />

          <div className="flex h-10 items-center gap-3 border-b border-white/10 bg-[#0b2928] px-3 text-white sm:px-4">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="h-2 w-2 rounded-full bg-[#ff7a73]" />
              <span className="h-2 w-2 rounded-full bg-[#ffc55c]" />
              <span className="h-2 w-2 rounded-full bg-[#58d69f]" />
            </div>
            <div className="mx-auto flex min-w-0 max-w-[18rem] flex-1 items-center justify-center gap-2 rounded-md border border-white/10 bg-white/[0.06] px-3 py-1 text-[0.56rem] font-medium text-emerald-50/65">
              <ShieldCheck className="h-2.5 w-2.5 shrink-0 text-brand-300" />
              <span className="truncate">secure.hms.local / command-center</span>
            </div>
            <div className="hms-desktop-live flex items-center gap-1.5 text-[0.52rem] font-bold uppercase tracking-[0.1em] text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
              Live
            </div>
          </div>

          <div className="grid min-h-[430px] grid-cols-[3.1rem_minmax(0,1fr)] sm:min-h-[470px] sm:grid-cols-[4rem_minmax(0,1fr)]">
            <aside className="flex flex-col items-center bg-brand-950 px-2 py-3 text-white sm:py-4" aria-label="Command center navigation preview">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-800 shadow-lg sm:h-9 sm:w-9">
                <HeartPulse className="h-4 w-4" strokeWidth={2.4} />
              </span>
              <nav className="mt-6 flex flex-1 flex-col items-center gap-2.5">
                {navigation.map((Icon, index) => (
                  <span key={index} className={`hms-desktop-nav-item ${index === 0 ? 'is-active' : ''}`} aria-hidden="true">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                ))}
              </nav>
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-brand-200 sm:h-8 sm:w-8">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            </aside>

            <div className="min-w-0 overflow-hidden bg-[#f3f7f7]">
              <header className="flex h-14 items-center justify-between border-b border-slate-200/80 bg-white px-3 sm:h-16 sm:px-5">
                <div className="min-w-0">
                  <p className="truncate text-[0.72rem] font-bold tracking-[-0.01em] text-slate-900 sm:text-sm">Hospital command center</p>
                  <p className="mt-0.5 hidden text-[0.55rem] text-slate-500 sm:block">Monday, 01 September · Morning shift</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[0.58rem] text-slate-400 md:flex">
                    <Search className="h-3 w-3" /> Search
                  </span>
                  <span className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500">
                    <Bell className="h-3.5 w-3.5" />
                    <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-[0.56rem] font-bold text-white">DR</span>
                </div>
              </header>

              <div className="p-3 sm:p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[0.52rem] font-bold uppercase tracking-[0.13em] text-brand-700">Operational overview</p>
                    <h2 className="mt-1 text-sm font-bold tracking-[-0.025em] text-slate-950 sm:text-lg">Good morning, care team.</h2>
                  </div>
                  <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[0.52rem] font-bold text-emerald-700 sm:flex">
                    <CheckCircle2 className="h-3 w-3" /> All systems operational
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
                  {metrics.map(({ label, value, change, icon: Icon }, index) => (
                    <article key={label} className={`hms-desktop-metric rounded-lg border border-slate-200/90 bg-white p-2.5 shadow-[0_4px_14px_rgba(15,23,42,0.035)] sm:rounded-xl sm:p-3 ${index === 2 ? 'hidden sm:block' : ''}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[0.52rem] font-bold uppercase tracking-[0.07em] text-slate-500">{label}</span>
                        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50 text-brand-700"><Icon className="h-3 w-3" /></span>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <strong className="text-lg tracking-[-0.04em] text-slate-950 sm:text-xl">{value}</strong>
                        <span className="mb-0.5 text-[0.5rem] font-bold text-emerald-600">{change}</span>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="mt-2 grid min-w-0 gap-2 sm:mt-3 sm:grid-cols-[1.12fr_.88fr] sm:gap-3">
                  <article className="min-w-0 rounded-lg border border-slate-200/90 bg-white p-3 sm:rounded-xl sm:p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[0.68rem] font-bold text-slate-900 sm:text-xs">Live patient flow</h3>
                        <p className="mt-0.5 text-[0.5rem] text-slate-500">Next consultations</p>
                      </div>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Activity className="h-3.5 w-3.5" /></span>
                    </div>

                    <div className="mt-2 space-y-0.5 sm:mt-3">
                      {patientFlow.map((patient, index) => (
                        <div key={patient.name} className={`hms-desktop-flow-row hms-desktop-flow-row-${index + 1} grid grid-cols-[2.1rem_1.55rem_minmax(0,1fr)_auto] items-center gap-1.5 rounded-lg px-1 py-1.5 sm:grid-cols-[2.35rem_1.8rem_minmax(0,1fr)_auto] sm:gap-2 sm:px-1.5 sm:py-2`}>
                          <span className="text-[0.5rem] font-bold text-brand-800 sm:text-[0.54rem]">{patient.time}</span>
                          <span className={`flex h-6 w-6 items-center justify-center rounded-md text-[0.47rem] font-bold sm:h-7 sm:w-7 ${patient.tone === 'brand' ? 'bg-brand-50 text-brand-800' : patient.tone === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'}`}>{patient.initials}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-[0.58rem] font-bold text-slate-800 sm:text-[0.62rem]">{patient.name}</span>
                            <span className="block truncate text-[0.47rem] text-slate-500 sm:text-[0.5rem]">{patient.care}</span>
                          </span>
                          <span className="hidden rounded-full bg-slate-100 px-1.5 py-1 text-[0.45rem] font-semibold text-slate-600 md:inline-flex">{patient.status}</span>
                        </div>
                      ))}
                    </div>
                  </article>

                  <article className="hidden min-w-0 rounded-xl border border-slate-200/90 bg-white p-3 sm:block sm:p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-[0.68rem] font-bold text-slate-900 sm:text-xs">Patient activity</h3>
                        <p className="mt-0.5 text-[0.5rem] text-slate-500">Last 7 days</p>
                      </div>
                      <span className="rounded-md bg-emerald-50 px-1.5 py-1 text-[0.48rem] font-bold text-emerald-700">+14.8%</span>
                    </div>
                    <div className="relative mt-3 h-[5.2rem] overflow-hidden rounded-lg bg-gradient-to-b from-brand-50/70 to-white">
                      <div className="absolute inset-x-0 top-1/3 border-t border-dashed border-slate-200" />
                      <div className="absolute inset-x-0 top-2/3 border-t border-dashed border-slate-200" />
                      <svg viewBox="0 0 220 82" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient id="hms-chart-fill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#34d3b2" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#34d3b2" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,67 C20,61 28,53 44,56 C62,60 69,38 87,42 C105,46 113,25 132,31 C153,38 160,17 179,22 C194,27 205,12 220,9 L220,82 L0,82 Z" fill="url(#hms-chart-fill)" />
                        <path className="hms-desktop-chart-line" d="M0,67 C20,61 28,53 44,56 C62,60 69,38 87,42 C105,46 113,25 132,31 C153,38 160,17 179,22 C194,27 205,12 220,9" fill="none" stroke="#0b947d" strokeWidth="2.5" strokeLinecap="round" />
                        <circle className="hms-desktop-chart-dot" cx="220" cy="9" r="4" fill="#0b947d" stroke="white" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="mt-2 flex justify-between text-[0.43rem] font-medium text-slate-400"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div>
                  </article>
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 sm:mt-3 sm:gap-3">
                  {[
                    { label: 'ER readiness', value: '92%', color: 'bg-brand-500' },
                    { label: 'Lab turnaround', value: '84%', color: 'bg-blue-500' },
                    { label: 'Pharmacy queue', value: '68%', color: 'bg-amber-500' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-slate-200/90 bg-white px-2 py-2 sm:px-3">
                      <div className="flex items-center justify-between gap-1 text-[0.45rem] font-semibold text-slate-500 sm:text-[0.5rem]"><span className="truncate">{item.label}</span><strong className="text-slate-700">{item.value}</strong></div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100"><div className={`hms-desktop-progress h-full rounded-full ${item.color}`} style={{ width: item.value }} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="hms-desktop-neck" aria-hidden="true" />
        <div className="hms-desktop-base" aria-hidden="true" />
      </div>

      <div className="hms-desktop-notification hidden items-center gap-2.5 sm:flex" aria-hidden="true">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white"><TestTube2 className="h-3.5 w-3.5" /></span>
        <span><strong className="block text-[0.62rem] text-slate-800">Lab result verified</strong><span className="text-[0.5rem] text-slate-500">Patient record updated</span></span>
        <CheckCircle2 className="ml-2 h-3.5 w-3.5 text-emerald-500" />
      </div>

      <div className="hms-desktop-intelligence hidden items-center gap-2 sm:flex" aria-hidden="true">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-amber-600"><Zap className="h-3.5 w-3.5" /></span>
        <span><strong className="block text-[0.58rem] text-slate-800">Smart coordination</strong><span className="text-[0.48rem] text-slate-500">12 departments connected</span></span>
      </div>

      <span className="sr-only">A live visual preview showing appointments, active patients, bed availability, patient flow, analytics, and department readiness.</span>
    </div>
  )
}
