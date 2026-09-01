import Link from 'next/link'
import { CalendarDays, Clock3, FileText, HeartPulse, Pill, ReceiptIndianRupee } from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import { EmptyState, PageHeader, StatCard, StatusBadge } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'

interface PatientProfile { id: number; name: string; blood_group?: string | null }
interface PatientAppointment { id: number; appt_date: string; appt_time: string; status: string; reason?: string | null }

export default async function PatientHome() {
  const [profile, appointments] = await Promise.all([
    fetchAPI('/patients/me') as Promise<PatientProfile>,
    fetchAPI('/appointments/me') as Promise<PatientAppointment[]>,
  ])
  const active = appointments.filter((item) => !['cancelled', 'completed'].includes(item.status))
    .sort((a, b) => `${a.appt_date} ${a.appt_time}`.localeCompare(`${b.appt_date} ${b.appt_time}`))
  const nextAppointment = active[0]

  return <div className="space-y-7">
    <AutoRefresh interval={30000} />
    <PageHeader eyebrow="Personal healthcare portal" title={`Welcome, ${profile.name}`} description={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} actions={<Link href="/patient/appointments" className="hms-button hms-button-primary"><CalendarDays className="h-4 w-4" />Book appointment</Link>} />
    <section aria-label="My care summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="All appointments" value={appointments.length} icon={CalendarDays} href="/patient/appointments" tone="info" />
      <StatCard label="Upcoming" value={active.length} icon={Clock3} href="/patient/appointments" tone="warning" />
      <StatCard label="Completed visits" value={appointments.filter((item) => item.status === 'completed').length} icon={HeartPulse} href="/patient/appointments" tone="success" />
      <StatCard label="Blood group" value={profile.blood_group || 'Not recorded'} icon={FileText} href="/patient/profile" tone="danger" />
    </section>
    <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <section className="hms-card overflow-hidden"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="hms-eyebrow">Next visit</p><h2 className="mt-1 text-lg font-semibold">Upcoming appointment</h2></div><Link href="/patient/appointments" className="text-sm font-semibold text-brand-700 dark:text-brand-300">View all</Link></div>{nextAppointment ? <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center"><div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-300"><span className="text-lg font-bold leading-none">{new Date(`${nextAppointment.appt_date}T00:00:00`).getDate()}</span><span className="mt-1 text-[0.6rem] font-bold uppercase">{new Date(`${nextAppointment.appt_date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span></div><div><p className="font-semibold text-slate-900 dark:text-slate-100">{nextAppointment.reason || 'Hospital appointment'}</p><p className="mt-1 text-sm text-slate-500">{nextAppointment.appt_date} at {nextAppointment.appt_time}</p></div><StatusBadge status={nextAppointment.status} /></div> : <EmptyState title="No upcoming appointment" description="When you book a visit, the date, time, and status will appear here." action={<Link href="/patient/appointments" className="hms-button hms-button-primary">Book appointment</Link>} />}</section>
      <section className="hms-card p-5"><p className="hms-eyebrow">Quick access</p><h2 className="mt-1 text-lg font-semibold">My health records</h2><div className="mt-4 grid gap-2">{[{ href: '/patient/prescriptions', label: 'Prescriptions', icon: Pill }, { href: '/patient/billing', label: 'Bills and payments', icon: ReceiptIndianRupee }, { href: '/patient/profile', label: 'Personal profile', icon: FileText }].map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex min-h-12 items-center gap-3 rounded-xl border px-3.5 text-sm font-semibold text-slate-700 hover:border-brand-300 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-brand-950"><Icon className="h-4 w-4 text-brand-700 dark:text-brand-300" />{label}</Link>)}</div></section>
    </div>
  </div>
}
