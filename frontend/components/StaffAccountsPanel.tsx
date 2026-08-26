'use client'

import { useRef, useState } from 'react'

import { createStaffAccountAction } from '@/app/actions/staff'
import type { AccountSummary } from '@/components/AdminAccountsPanel'
import SubmitButton from '@/components/SubmitButton'

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
  const [role, setRole] = useState<string>('nurse')
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
    setRole('nurse')
    setSuccess('Staff account created successfully.')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create staff account</h2>
        <p className="mt-1 text-sm text-gray-600">
          Available only to Admin and Super Admin. Patient and administrator roles cannot be created here.
        </p>
        <form ref={formRef} action={submit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {error && <p className="md:col-span-2 xl:col-span-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p className="md:col-span-2 xl:col-span-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
          <input name="name" required maxLength={100} placeholder="Full name" className="rounded-lg border p-3" />
          <input name="email" required type="email" placeholder="Email address" className="rounded-lg border p-3" />
          <input name="password" required type="password" minLength={8} placeholder="Strong temporary password" className="rounded-lg border p-3" />
          <select name="role" value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border bg-white p-3">
            {STAFF_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          {role === 'doctor' && (
            <>
              <input name="specialization" required placeholder="Specialization" className="rounded-lg border p-3" />
              <input name="consultation_fee" required type="number" min="0.01" step="0.01" placeholder="Consultation fee" className="rounded-lg border p-3" />
              <input name="contact" maxLength={20} placeholder="Contact" className="rounded-lg border p-3" />
              <div className="grid grid-cols-2 gap-2">
                <input name="timing_start" type="time" aria-label="Doctor start time" className="rounded-lg border p-3" />
                <input name="timing_end" type="time" aria-label="Doctor end time" className="rounded-lg border p-3" />
              </div>
            </>
          )}

          {role === 'receptionist' && (
            <>
              <input name="designation" required placeholder="Designation" className="rounded-lg border p-3" />
              <input name="joining_date" type="date" aria-label="Joining date" className="rounded-lg border p-3" />
              <input name="shift_start" type="time" aria-label="Shift start" className="rounded-lg border p-3" />
              <input name="shift_end" type="time" aria-label="Shift end" className="rounded-lg border p-3" />
            </>
          )}

          <p className="md:col-span-2 xl:col-span-3 text-xs text-gray-500">
            Passwords require uppercase, lowercase, a number, and a special character. New receptionist permissions start disabled.
          </p>
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">
            Create Staff Account
          </SubmitButton>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Profile</th><th className="p-4">Status</th></tr>
          </thead>
          <tbody className="divide-y">
            {accounts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No staff accounts created yet.</td></tr>
            ) : accounts.map((account) => (
              <tr key={account.id}>
                <td className="p-4 font-medium text-gray-900">{account.name}</td>
                <td className="p-4 text-gray-700">{account.email}</td>
                <td className="p-4 capitalize">{account.role.replaceAll('_', ' ')}</td>
                <td className="p-4 text-gray-600">{account.profile_id ? `#${account.profile_id}` : 'Not required'}</td>
                <td className="p-4">{account.is_active ? 'Active' : 'Disabled'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
