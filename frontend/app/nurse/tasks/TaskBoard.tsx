'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { updateNursingTaskAction } from '@/app/actions/nurse'
import SubmitButton from '@/components/SubmitButton'
import type { NurseTask } from '@/lib/nurseTypes'
import { priorityClass, statusClass, statusLabel } from '@/lib/nurseTypes'

export default function TaskBoard({ tasks }: { tasks: NurseTask[] }) {
  const [status, setStatus] = useState('active')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const filtered = useMemo(() => tasks.filter((task) => {
    if (status === 'active') return task.status === 'pending' || task.status === 'in_progress'
    return status === 'all' || task.status === status
  }), [status, tasks])

  async function update(formData: FormData) {
    setMessage('')
    setError('')
    const result = await updateNursingTaskAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    setMessage('Nursing task updated successfully.')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Assigned care</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Nursing Tasks</h1><p className="mt-1 text-slate-600">Start and complete only the tasks assigned to you.</p></div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-300 bg-white px-4 py-3">
          <option value="active">Active tasks</option><option value="all">All tasks</option><option value="pending">Pending</option><option value="in_progress">In progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
        </select>
      </div>
      {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}
      {filtered.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">No nursing tasks found.</div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((task) => (
            <section key={task.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{task.task_type}</p><h2 className="mt-1 text-lg font-semibold text-slate-900">{task.patient_name}</h2></div><div className="flex gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${priorityClass(task.priority)}`}>{task.priority}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClass(task.status)}`}>{statusLabel(task.status)}</span></div></div>
              <p className="mt-4 whitespace-pre-line text-sm text-slate-700">{task.description}</p>
              <p className="mt-3 text-xs text-slate-500">Due: {task.due_at ? new Date(task.due_at).toLocaleString() : 'No deadline'} · Task #{task.id}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/nurse/patient/${task.patient_id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Patient record</Link>
                {task.status === 'pending' && <form action={update}><input type="hidden" name="task_id" value={task.id} /><input type="hidden" name="patient_id" value={task.patient_id} /><input type="hidden" name="status" value="in_progress" /><SubmitButton className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">Start task</SubmitButton></form>}
                {task.status === 'in_progress' && <form action={update}><input type="hidden" name="task_id" value={task.id} /><input type="hidden" name="patient_id" value={task.patient_id} /><input type="hidden" name="status" value="completed" /><SubmitButton className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Complete task</SubmitButton></form>}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
