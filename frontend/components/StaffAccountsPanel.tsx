'use client'

import { useRef, useState } from 'react'

import { createStaffAccountAction, setHospitalManagerActiveAction } from '@/app/actions/staff'
import type { AccountSummary } from '@/components/AdminAccountsPanel'
import SubmitButton from '@/components/SubmitButton'

const RECEPTIONIST_PAGE_ACCESS = [
  ['can_register_patient', 'Patient registration', 'Create new patient records'],
  ['can_schedule_appointment', 'Appointment scheduling', 'Book and confirm appointments'],
  ['can_checkin_patient', 'Patient queue', 'Check in arriving patients'],
  ['can_collect_billing', 'Billing collection', 'Collect payments and issue receipts'],
] as const

const STAFF_ROLES = [
  ['hospital_manager', 'Hospital Manager'],
  ['doctor', 'Doctor'],
  ['receptionist', 'Receptionist'],
  ['nurse', 'Nurse'],
  ['pharmacist', 'Pharmacist'],
  ['lab_technician', 'Lab Technician'],
  ['radiologist', 'Radiologist'],
  ['accountant', 'Accountant'],
  ['insurance_officer', 'Insurance Officer'],
  ['ambulance_staff', 'Ambulance Staff'],
] as const

export default function StaffAccountsPanel({ accounts }: { accounts: AccountSummary[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [role, setRole] = useState<string>('hospital_manager')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await createStaffAccountAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    formRef.current?.reset()
    setRole('hospital_manager')
    setSuccess(result.warning || 'Staff account created successfully.')
  }

  async function toggleManagerStatus(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await setHospitalManagerActiveAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess('Hospital Manager status updated.')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create staff account</h2>
        <p className="mt-1 text-sm text-gray-600">
          Admin creates Hospital Manager and other clinical or operational staff accounts here.
        </p>
        <form ref={formRef} action={submit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {error && <p className="md:col-span-2 xl:col-span-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p className="md:col-span-2 xl:col-span-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
          <input name="name" aria-label="Staff full name" autoComplete="name" required maxLength={100} placeholder="Full name" className="rounded-lg border p-3" />
          <input name="email" aria-label="Staff email address" autoComplete="email" required type="email" placeholder="Email address" className="rounded-lg border p-3" />
          <input name="password" aria-label="Staff temporary password" autoComplete="new-password" required type="password" minLength={8} placeholder="Strong temporary password" className="rounded-lg border p-3" />
          <select name="role" aria-label="Staff role" value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border bg-white p-3">
            {STAFF_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          {role === 'doctor' && (
            <>
              <input name="specialization" aria-label="Doctor specialization" required placeholder="Specialization" className="rounded-lg border p-3" />
              <input name="consultation_fee" aria-label="Doctor consultation fee" required type="number" min="0.01" step="0.01" placeholder="Consultation fee" className="rounded-lg border p-3" />
              <input name="contact" aria-label="Doctor contact number" maxLength={20} placeholder="Contact" className="rounded-lg border p-3" />
              <div className="grid grid-cols-2 gap-2">
                <input name="timing_start" type="time" aria-label="Doctor start time" className="rounded-lg border p-3" />
                <input name="timing_end" type="time" aria-label="Doctor end time" className="rounded-lg border p-3" />
              </div>
            </>
          )}

          {role === 'receptionist' && (
            <>
              <input name="joining_date" type="date" aria-label="Joining date" className="rounded-lg border p-3" />
              <input name="shift_start" type="time" aria-label="Shift start" className="rounded-lg border p-3" />
              <input name="shift_end" type="time" aria-label="Shift end" className="rounded-lg border p-3" />
              <fieldset className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2 xl:col-span-4">
                <legend className="px-1 text-sm font-semibold text-slate-900">Assign receptionist pages</legend>
                <p className="mt-1 text-xs text-slate-500">Front desk overview and patient directory remain available. Select the additional pages this account should access.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {RECEPTIONIST_PAGE_ACCESS.map(([name, label, description]) => (
                    <label key={name} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:bg-brand-50/40">
                      <input type="checkbox" name={name} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600" />
                      <span>
                        <span className="block text-sm font-semibold text-slate-900">{label}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          )}

          <p className="md:col-span-2 xl:col-span-3 text-xs text-gray-500">
            Passwords require uppercase, lowercase, a number, and a special character.
          </p>
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">
            Create Staff Account
          </SubmitButton>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Profile</th><th className="p-4">Status</th><th className="p-4">Action</th></tr>
          </thead>
          <tbody className="divide-y">
            {accounts.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No staff accounts created yet.</td></tr>
            ) : accounts.map((account) => (
              <tr key={account.id}>
                <td className="p-4 font-medium text-gray-900">{account.name}</td>
                <td className="p-4 text-gray-700">{account.email}</td>
                <td className="p-4 capitalize">{account.role.replaceAll('_', ' ')}</td>
                <td className="p-4 text-gray-600">{account.profile_id ? `#${account.profile_id}` : 'Not required'}</td>
                <td className="p-4">{account.is_active ? 'Active' : 'Disabled'}</td>
                <td className="p-4">
                  {account.role === 'hospital_manager' ? (
                    <form action={toggleManagerStatus}>
                      <input type="hidden" name="id" value={account.id} />
                      <input type="hidden" name="is_active" value={String(!account.is_active)} />
                      <SubmitButton className="rounded-lg border px-3 py-2 hover:bg-gray-50">
                        {account.is_active ? 'Deactivate' : 'Activate'}
                      </SubmitButton>
                    </form>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
