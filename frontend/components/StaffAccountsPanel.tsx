'use client'

import { useRef, useState } from 'react'
import { Eye, Loader2, ShieldCheck, UserRound } from 'lucide-react'

import {
  createStaffAccountAction,
  getStaffAccountAction,
  setHospitalManagerActiveAction,
  updateStaffRoleAction,
} from '@/app/actions/staff'
import type { StaffAccountDetails } from '@/app/actions/staff'
import type { AccountSummary } from '@/components/AdminAccountsPanel'
import SubmitButton from '@/components/SubmitButton'
import SpecializationCombobox from '@/components/SpecializationCombobox'
import { StatusBadge } from '@/components/ui/HmsUI'
import { Modal } from '@/components/ui/Modal'

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
  const [role, setRole] = useState('hospital_manager')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [details, setDetails] = useState<StaffAccountDetails | null>(null)
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [selectedRole, setSelectedRole] = useState('')
  const [roleError, setRoleError] = useState('')

  async function submit(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await createStaffAccountAction(formData)
    if (result.error) return setError(result.error)
    formRef.current?.reset()
    setRole('hospital_manager')
    setSuccess(result.warning || 'Staff account created successfully.')
  }

  async function toggleManagerStatus(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await setHospitalManagerActiveAction(formData)
    if (result.error) return setError(result.error)
    setSuccess('Hospital Manager status updated.')
  }

  async function viewAccount(id: number) {
    setError('')
    setLoadingId(id)
    const result = await getStaffAccountAction(id)
    setLoadingId(null)
    if (result.error || !result.account) return setError(result.error || 'Failed to load staff details.')
    setDetails(result.account)
    setSelectedRole(result.account.role)
    setRoleError('')
  }

  async function changeRole(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await updateStaffRoleAction(formData)
    if (result.error) return setRoleError(result.error)
    setDetails(null)
    setSuccess(`Role updated to ${selectedRole.replaceAll('_', ' ')} successfully.`)
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create staff account</h2>
        <p className="mt-1 text-sm text-gray-600">Admin creates Hospital Manager and other clinical or operational staff accounts here.</p>
        <form ref={formRef} action={submit} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 md:col-span-2 xl:col-span-4">{error}</p>}
          {success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 md:col-span-2 xl:col-span-4">{success}</p>}
          <input name="name" aria-label="Staff full name" autoComplete="name" required maxLength={100} placeholder="Full name" className="rounded-lg border p-3" />
          <input name="email" aria-label="Staff email address" autoComplete="email" required type="email" placeholder="Email address" className="rounded-lg border p-3" />
          <input name="password" aria-label="Staff temporary password" autoComplete="new-password" required type="password" minLength={8} placeholder="Strong temporary password" className="rounded-lg border p-3" />
          <select name="role" aria-label="Staff role" value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border bg-white p-3">
            {STAFF_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>

          {role === 'doctor' && <>
            <SpecializationCombobox id="staff-doctor-specialization" className="rounded-lg border bg-white p-3" />
            <input name="consultation_fee" aria-label="Doctor consultation fee" required type="number" min="0.01" step="0.01" placeholder="Consultation fee" className="rounded-lg border p-3" />
            <input name="contact" aria-label="Doctor contact number" maxLength={20} placeholder="Contact" className="rounded-lg border p-3" />
            <div className="grid grid-cols-2 gap-2"><input name="timing_start" type="time" aria-label="Doctor start time" className="rounded-lg border p-3" /><input name="timing_end" type="time" aria-label="Doctor end time" className="rounded-lg border p-3" /></div>
          </>}

          {role === 'receptionist' && <>
            <input name="joining_date" type="date" aria-label="Joining date" className="rounded-lg border p-3" />
            <input name="shift_start" type="time" aria-label="Shift start" className="rounded-lg border p-3" />
            <input name="shift_end" type="time" aria-label="Shift end" className="rounded-lg border p-3" />
            <fieldset className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:col-span-2 xl:col-span-4">
              <legend className="px-1 text-sm font-semibold text-slate-900">Assign receptionist pages</legend>
              <p className="mt-1 text-xs text-slate-500">Front desk overview and patient directory remain available. Select the additional pages this account should access.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{RECEPTIONIST_PAGE_ACCESS.map(([name, label, description]) => (
                <label key={name} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:bg-brand-50/40">
                  <input type="checkbox" name={name} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-600" />
                  <span><span className="block text-sm font-semibold text-slate-900">{label}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></span>
                </label>
              ))}</div>
            </fieldset>
          </>}

          <p className="text-xs text-gray-500 md:col-span-2 xl:col-span-3">Passwords require uppercase, lowercase, a number, and a special character.</p>
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">Create Staff Account</SubmitButton>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th><th className="p-4">Profile</th><th className="p-4">Status</th><th className="p-4">Actions</th></tr></thead>
          <tbody className="divide-y">
            {accounts.length === 0 ? <tr><td colSpan={6} className="p-8 text-center text-gray-500">No staff accounts created yet.</td></tr> : accounts.map((account) => (
              <tr key={account.id}>
                <td className="p-4 font-medium text-gray-900">{account.name}</td>
                <td className="p-4 text-gray-700">{account.email}</td>
                <td className="p-4 capitalize">{account.role.replaceAll('_', ' ')}</td>
                <td className="p-4 text-gray-600">{account.profile_id ? `#${account.profile_id}` : 'Not required'}</td>
                <td className="p-4"><StatusBadge status={account.is_active ? 'Active' : 'Disabled'} /></td>
                <td className="p-4"><div className="flex items-center gap-2">
                  <button type="button" onClick={() => viewAccount(account.id)} disabled={loadingId === account.id} className="hms-button hms-button-secondary whitespace-nowrap">
                    {loadingId === account.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}View details
                  </button>
                  {account.role === 'hospital_manager' && <form action={toggleManagerStatus}>
                    <input type="hidden" name="id" value={account.id} /><input type="hidden" name="is_active" value={String(!account.is_active)} />
                    <SubmitButton className="hms-button hms-button-secondary whitespace-nowrap">{account.is_active ? 'Deactivate' : 'Activate'}</SubmitButton>
                  </form>}
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <StaffDetailsModal details={details} selectedRole={selectedRole} setSelectedRole={setSelectedRole} changeRole={changeRole} roleError={roleError} onClose={() => setDetails(null)} />
    </div>
  )
}

function StaffDetailsModal({ details, selectedRole, setSelectedRole, changeRole, roleError, onClose }: {
  details: StaffAccountDetails | null
  selectedRole: string
  setSelectedRole: (role: string) => void
  changeRole: (formData: FormData) => Promise<void>
  roleError: string
  onClose: () => void
}) {
  const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : 'Not available'
  const profile = details?.profile

  return <Modal open={Boolean(details)} title="Staff account details" description="Review the complete account record and update its assigned staff role." onClose={onClose} size="lg">
    {details && <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><span className="rounded-full bg-brand-50 p-3 text-brand-700"><UserRound className="h-5 w-5" /></span><div><p className="font-semibold text-slate-900">{details.name}</p><p className="text-sm text-slate-500">Account ID #{details.id}</p></div></div>
          <StatusBadge status={details.is_active ? 'Active' : 'Disabled'} />
        </div>
        <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Email" value={details.email} /><Detail label="Current role" value={details.role.replaceAll('_', ' ')} capitalize />
          <Detail label="Email verification" value={details.is_email_verified ? 'Verified' : 'Not verified'} /><Detail label="Email verified at" value={formatDate(details.email_verified_at)} />
          <Detail label="Created" value={formatDate(details.created_at)} /><Detail label="Last updated" value={formatDate(details.updated_at)} /><Detail label="Last login" value={formatDate(details.last_login_at)} />
        </dl>
      </section>

      {profile ? <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{profile.type} profile</h3>
        <dl className="mt-3 grid gap-x-6 gap-y-4 rounded-xl border border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Profile ID" value={`#${profile.id}`} />
          {profile.type === 'doctor' ? <><Detail label="Specialization" value={profile.specialization || 'Not provided'} /><Detail label="Department ID" value={profile.department_id ? `#${profile.department_id}` : 'Not assigned'} /><Detail label="Consultation fee" value={profile.consultation_fee != null ? String(profile.consultation_fee) : 'Not provided'} /><Detail label="Contact" value={profile.contact || 'Not provided'} /><Detail label="Working hours" value={profile.timing_start && profile.timing_end ? `${profile.timing_start} – ${profile.timing_end}` : 'Not provided'} /></> : <><Detail label="Designation" value={profile.designation || 'Not provided'} /><Detail label="Joining date" value={profile.joining_date || 'Not provided'} /><Detail label="Shift" value={profile.shift_start && profile.shift_end ? `${profile.shift_start} – ${profile.shift_end}` : 'Not provided'} /></>}
          <Detail label="Profile status" value={profile.status || 'Not available'} capitalize /><Detail label="Profile created" value={formatDate(profile.created_at)} /><Detail label="Profile updated" value={formatDate(profile.updated_at)} />
        </dl>
        {profile.type === 'receptionist' && profile.permissions && <div className="mt-3 rounded-xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assigned page access</p><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(profile.permissions).map(([permission, enabled]) => <div key={permission} className="flex items-center justify-between gap-3 text-sm"><span className="capitalize text-slate-700">{permission.replaceAll('_', ' ').replace('can ', '')}</span><StatusBadge status={enabled ? 'Enabled' : 'Disabled'} /></div>)}</div></div>}
      </section> : <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">This role does not require a separate staff profile.</p>}

      <form action={changeRole} className="rounded-xl border border-brand-200 bg-brand-50/40 p-4">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-brand-700" /><div><h3 className="font-semibold text-slate-900">Change staff role</h3><p className="mt-1 text-sm text-slate-600">Access changes immediately and the update is recorded in the audit log.</p></div></div>
        {roleError && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{roleError}</p>}
        <input type="hidden" name="id" value={details.id} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-semibold text-slate-700">New role</span><select name="role" value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)} className="hms-input">{STAFF_ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          {selectedRole === 'doctor' && <><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Specialization</span><SpecializationCombobox id="role-doctor-specialization" defaultValue={profile?.type === 'doctor' ? profile.specialization : ''} /></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Consultation fee</span><input name="consultation_fee" required type="number" min="0.01" step="0.01" defaultValue={profile?.type === 'doctor' ? profile.consultation_fee ?? '' : ''} className="hms-input" /></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Contact</span><input name="contact" maxLength={20} defaultValue={profile?.type === 'doctor' ? profile.contact || '' : ''} className="hms-input" /></label><TimeFields prefix="timing" start={profile?.type === 'doctor' ? profile.timing_start : null} end={profile?.type === 'doctor' ? profile.timing_end : null} /></>}
          {selectedRole === 'receptionist' && <><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Designation</span><input name="designation" required maxLength={100} defaultValue={profile?.type === 'receptionist' ? profile.designation || '' : 'Receptionist'} className="hms-input" /></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Joining date</span><input name="joining_date" type="date" defaultValue={profile?.type === 'receptionist' ? profile.joining_date || '' : ''} className="hms-input" /></label><TimeFields prefix="shift" start={profile?.type === 'receptionist' ? profile.shift_start : null} end={profile?.type === 'receptionist' ? profile.shift_end : null} /></>}
        </div>
        <div className="mt-4 flex justify-end"><SubmitButton disabled={selectedRole === details.role}>Update role</SubmitButton></div>
      </form>
    </div>}
  </Modal>
}

function TimeFields({ prefix, start, end }: { prefix: 'timing' | 'shift', start?: string | null, end?: string | null }) {
  return <div className="grid grid-cols-2 gap-2"><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">Start time</span><input name={`${prefix}_start`} type="time" defaultValue={start?.slice(0, 5) || ''} className="hms-input" /></label><label><span className="mb-1.5 block text-sm font-semibold text-slate-700">End time</span><input name={`${prefix}_end`} type="time" defaultValue={end?.slice(0, 5) || ''} className="hms-input" /></label></div>
}

function Detail({ label, value, capitalize = false }: { label: string, value: string, capitalize?: boolean }) {
  return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 break-words text-sm font-medium text-slate-800 ${capitalize ? 'capitalize' : ''}`}>{value}</dd></div>
}
