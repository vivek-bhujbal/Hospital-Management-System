'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { addEmployeeAction } from '@/app/actions/admin'
import SubmitButton from '@/components/SubmitButton'
import { Modal } from '@/components/ui/Modal'

export default function AddEmployeeModal() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')

  async function action(formData: FormData) {
    const response = await addEmployeeAction(formData)
    if (response?.error) setError(response.error)
    else {
      setOpen(false)
      setError('')
    }
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="hms-button hms-button-primary"><Plus className="h-4 w-4" />Add employee</button>
    <Modal open={open} onClose={() => setOpen(false)} title="Add employee" description="Create a front-desk or billing account. Access remains controlled by the assigned role.">
      <form action={action} className="space-y-4">
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Full name<span className="ml-1 text-rose-500">*</span><input required type="text" name="name" autoComplete="name" className="hms-input mt-1.5" /></label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Email address<span className="ml-1 text-rose-500">*</span><input required type="email" name="email" autoComplete="email" className="hms-input mt-1.5" /></label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Temporary password<span className="ml-1 text-rose-500">*</span><input required type="password" name="password" autoComplete="new-password" className="hms-input mt-1.5" /><span className="mt-1.5 block text-xs font-normal text-slate-500">Use uppercase, lowercase, a number, and a special character.</span></label>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Designation<select name="designation" className="hms-input mt-1.5"><option value="Receptionist">Receptionist</option><option value="Front Desk">Front Desk</option><option value="Billing Agent">Billing Agent</option></select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Shift start<input type="time" name="shift_start" className="hms-input mt-1.5" /></label><label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">Shift end<input type="time" name="shift_end" className="hms-input mt-1.5" /></label></div>
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={() => setOpen(false)} className="hms-button hms-button-secondary">Cancel</button><SubmitButton>Save employee</SubmitButton></div>
      </form>
    </Modal>
  </>
}
