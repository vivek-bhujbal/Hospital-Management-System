'use client'

import { ClipboardPlus } from 'lucide-react'
import { useRef, useState } from 'react'

import { assignNursingTaskAction } from '@/app/actions/doctor'
import SubmitButton from '@/components/SubmitButton'
import { useToast } from '@/components/ToastProvider'
import { Modal } from '@/components/ui/Modal'
import type { DoctorNurseOption } from '@/lib/doctorTypes'

interface Props {
  patientId: number
  patientName: string
  nurses: DoctorNurseOption[]
}

export default function AssignNursingTaskForm({ patientId, patientName, nurses }: Props) {
  const formRef = useRef<HTMLFormElement>(null)
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function submit(formData: FormData) {
    setError('')
    const result = await assignNursingTaskAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    formRef.current?.reset()
    setOpen(false)
    showToast(`Nursing task assigned for ${patientName}.`, 'success')
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="hms-button hms-button-primary">
      <ClipboardPlus aria-hidden="true" className="h-4 w-4" /> Assign nursing task
    </button>
    <Modal
      open={open}
      title="Assign nursing task"
      description={`Create an assignment-scoped care task for ${patientName}.`}
      onClose={() => setOpen(false)}
      size="md"
    >
      <form ref={formRef} action={submit} className="space-y-4">
        <input type="hidden" name="patient_id" value={patientId} />
        {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Patient</p>
          <p className="mt-1 font-semibold text-slate-950">{patientName} <span className="font-normal text-slate-500">#{patientId}</span></p>
        </div>
        {nurses.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">No active Nurse account is available. Ask an Admin to create or activate a Nurse account first.</p>
        ) : <>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Assign Nurse</span><select name="assigned_nurse_id" required defaultValue="" className="hms-input"><option value="" disabled>Select an active Nurse</option>{nurses.map((nurse) => <option key={nurse.id} value={nurse.id}>{nurse.name} (#{nurse.id})</option>)}</select></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Task title</span><input name="task_type" required maxLength={100} placeholder="Example: Record post-operative vitals" className="hms-input" /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-semibold text-slate-700">Task description</span><textarea name="description" required maxLength={4000} rows={4} placeholder="Describe the required nursing care and Doctor instructions." className="hms-input min-h-28" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Priority</span><select name="priority" defaultValue="medium" className="hms-input"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="emergency">Urgent</option></select></label>
            <label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Due date and time <span className="font-normal text-slate-500">(optional)</span></span><input name="due_at" type="datetime-local" className="hms-input" /></label>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">The task starts as Pending. This Nurse gains patient access only while they have a Pending or In Progress task.</div>
          <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setOpen(false)} className="hms-button hms-button-secondary">Cancel</button><SubmitButton>Assign task</SubmitButton></div>
        </>}
      </form>
    </Modal>
  </>
}
