'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import type { NurseHistorySummary } from '@/lib/nurseTypes'
import { priorityClass, statusClass, statusLabel } from '@/lib/nurseTypes'

export default function HistoryDirectory({ records }: { records: NurseHistorySummary[] }) {
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState('all')
  const filtered = useMemo(() => records.filter((record) => {
    const query = search.trim().toLowerCase()
    const matchesSearch = !query || record.patient_name.toLowerCase().includes(query)
      || String(record.patient_id).includes(query)
      || record.contact?.toLowerCase().includes(query)
    const matchesScope = scope === 'all'
      || (scope === 'active' ? record.active_task_count > 0 : record.active_task_count === 0)
    return matchesSearch && matchesScope
  }), [records, scope, search])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Read-only care archive</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Patient History</h1>
        <p className="mt-1 text-slate-600">Review patients assigned to you and the tasks, vitals, and observations you recorded.</p>
      </div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_220px]">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search patient name, ID, or contact" className="rounded-xl border border-slate-300 px-4 py-3" />
        <select value={scope} onChange={(event) => setScope(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3">
          <option value="all">All history</option><option value="active">Active assignments</option><option value="completed">Past assignments</option>
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{records.length === 0 ? 'No patient work history recorded yet.' : 'No history matches your filters.'}</div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filtered.map((record) => (
            <section key={record.patient_id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Patient #{record.patient_id}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{record.patient_name}</h2><p className="mt-1 text-sm text-slate-500">{record.contact || 'No contact'} · {record.blood_group || 'Blood group N/A'}</p></div>
                <div className="flex gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${priorityClass(record.latest_task_priority)}`}>{record.latest_task_priority === 'emergency' ? 'Urgent' : record.latest_task_priority}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(record.latest_task_status)}`}>{statusLabel(record.latest_task_status)}</span></div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-900">{record.task_count}</p><p className="text-xs text-slate-500">Tasks</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-900">{record.vital_count}</p><p className="text-xs text-slate-500">Vitals</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-bold text-slate-900">{record.note_count}</p><p className="text-xs text-slate-500">Notes</p></div></div>
              <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">Last activity: {record.last_activity_at ? new Date(record.last_activity_at).toLocaleString() : 'Not recorded'}</p><Link href={`/nurse/history/${record.patient_id}`} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">View full history</Link></div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
