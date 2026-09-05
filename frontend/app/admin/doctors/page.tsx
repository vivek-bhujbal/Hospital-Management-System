import Link from 'next/link'
import { Eye, Pencil, Stethoscope, Trash2 } from 'lucide-react'

import ConfirmDeleteForm from '@/components/ConfirmDeleteForm'
import { EmptyState, PageHeader, StatusBadge } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'
import { deleteDoctorAction } from '@/app/actions/admin'
import AddDoctorForm from './AddDoctorForm'

interface DoctorSummary { id: number; name: string; specialization: string; timing_start: string; timing_end: string; status?: string }

export default async function AdminDoctors() {
  const doctors = await fetchAPI('/admin/doctors') as DoctorSummary[]
  return <div className="space-y-6">
    <PageHeader eyebrow="Clinical workforce" title="Doctors" description="Create clinician profiles, maintain schedules, and manage access securely." />
    <section className="hms-card overflow-hidden"><div className="flex items-start gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6"><span className="rounded-xl bg-brand-50 p-2.5 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><Stethoscope className="h-5 w-5" /></span><div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Add doctor profile</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create a clinical profile and secure login in one step.</p></div></div><div className="p-5 sm:p-6"><AddDoctorForm /></div></section>
    <section className="hms-card overflow-hidden"><div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800"><h2 className="font-bold text-slate-900 dark:text-slate-50">Doctor directory</h2><p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{doctors.length} clinician{doctors.length === 1 ? '' : 's'} registered</p></div>
      {doctors.length === 0 ? <EmptyState title="No doctors found" description="Add the first doctor profile using the form above." /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-900/60 dark:text-slate-400"><tr><th className="px-5 py-3.5">Doctor</th><th className="px-5 py-3.5">Specialty</th><th className="px-5 py-3.5">Shift</th><th className="px-5 py-3.5">Status</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-200 dark:divide-slate-800">{doctors.map(doctor => <tr key={doctor.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/50"><td className="px-5 py-4"><p className="font-bold text-slate-900 dark:text-slate-50">{doctor.name}</p><p className="text-xs text-slate-500">ID #{doctor.id}</p></td><td className="px-5 py-4 text-slate-600 dark:text-slate-300">{doctor.specialization}</td><td className="whitespace-nowrap px-5 py-4 text-slate-600 dark:text-slate-300">{doctor.timing_start} – {doctor.timing_end}</td><td className="px-5 py-4"><StatusBadge status={doctor.status || 'active'} /></td><td className="px-5 py-4"><div className="flex justify-end gap-2"><Link href={`/admin/doctors/${doctor.id}`} aria-label={`View ${doctor.name}`} className="hms-button hms-button-secondary min-h-9 px-3 py-2"><Eye className="h-4 w-4" /></Link><Link href={`/admin/doctors/${doctor.id}/edit`} aria-label={`Edit ${doctor.name}`} className="hms-button hms-button-secondary min-h-9 px-3 py-2"><Pencil className="h-4 w-4" /></Link><ConfirmDeleteForm action={deleteDoctorAction} title="Delete doctor?" description={`This will permanently delete ${doctor.name}'s doctor profile and disable their login account. This action cannot be undone.`} successMessage="Doctor deleted." trigger={<Trash2 className="h-4 w-4" />} triggerLabel={`Delete ${doctor.name}`} confirmLabel="Delete doctor" triggerClassName="hms-button min-h-9 border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300"><input type="hidden" name="id" value={doctor.id} /></ConfirmDeleteForm></div></td></tr>)}</tbody></table></div>}
    </section>
  </div>
}
