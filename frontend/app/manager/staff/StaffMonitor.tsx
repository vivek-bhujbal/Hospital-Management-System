'use client'

import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { ManagerStaff, shortTime, statusLabel } from '@/lib/managerTypes'

export default function StaffMonitor({ staff }: { staff: ManagerStaff[] }) {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const normalized = query.trim().toLowerCase()
  const roles = Array.from(new Set(staff.map((member) => member.role))).sort()
  const filtered = useMemo(() => staff.filter((member) => (
    (!normalized || member.name.toLowerCase().includes(normalized) || (member.designation || '').toLowerCase().includes(normalized))
    && (!role || member.role === role)
    && (!status || member.status === status)
  )), [normalized, role, staff, status])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Operational workforce</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Staff</h1>
        <p className="mt-1 text-slate-600">Read-only staffing, shift, status, and availability information. Security permissions remain Admin-managed.</p>
      </div>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <label className="relative block"><span className="sr-only">Search staff</span><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or designation" className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3" /></label>
        <select value={role} onChange={(event) => setRole(event.target.value)} aria-label="Filter by staff role" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">All roles</option>{roles.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}</select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filter by staff status" className="rounded-lg border border-slate-300 bg-white px-3 py-2.5"><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">{staff.length ? 'No staff match the selected filters.' : 'No operational staff available.'}</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-4">Staff member</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Designation</th><th className="px-6 py-4">Department</th><th className="px-6 py-4">Shift</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Availability</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.map((member) => (
            <tr key={member.id} className="hover:bg-slate-50">
              <td className="px-6 py-4 font-semibold text-slate-900">{member.name}</td>
              <td className="px-6 py-4 capitalize text-slate-700">{statusLabel(member.role)}</td>
              <td className="px-6 py-4 text-slate-700">{member.designation || 'Not recorded'}</td>
              <td className="px-6 py-4 text-slate-700">{member.department_name || 'Not assigned'}</td>
              <td className="whitespace-nowrap px-6 py-4 text-slate-700">{member.shift_start || member.shift_end ? `${shortTime(member.shift_start)} – ${shortTime(member.shift_end)}` : 'Not assigned'}</td>
              <td className="px-6 py-4 capitalize text-slate-700">{member.status}</td>
              <td className="px-6 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.availability === 'Available' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{member.availability}</span></td>
            </tr>
          ))}</tbody>
        </table></div></div>
      )}
    </div>
  )
}
