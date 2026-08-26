'use client'

import { useRef, useState } from 'react'

import {
  createFeatureFlagAction,
  createOrganizationAction,
  createRoleGrantAction,
  createSystemSettingAction,
  deleteRoleGrantAction,
  setFeatureFlagEnabledAction,
  setOrganizationActiveAction,
  updateSystemSettingAction,
} from '@/app/actions/superAdmin'
import SubmitButton from '@/components/SubmitButton'
import { PERMISSIONS } from '@/lib/permissions'

export interface OrganizationSummary {
  id: number
  name: string
  address: string | null
  contact_email: string | null
  contact_phone: string | null
  is_active: boolean
  created_at: string
}

export interface SystemSettingSummary {
  id: number
  setting_key: string
  setting_value: string | null
  description: string | null
  updated_at: string
  updated_by: number | null
}

export interface RoleGrantSummary {
  id: number
  role: string
  permission: string
  description: string | null
  created_at: string
  created_by: number
}

export interface FeatureFlagSummary {
  id: number
  feature_name: string
  is_enabled: boolean
  description: string | null
  updated_at: string
  updated_by: number | null
}

const ROLE_OPTIONS = [
  'admin',
  'hospital_manager',
  'doctor',
  'receptionist',
  'nurse',
  'pharmacist',
  'lab_technician',
  'radiologist',
  'accountant',
  'insurance_officer',
  'ambulance_staff',
] as const

const PERMISSION_OPTIONS = Object.values(PERMISSIONS).sort()

function Feedback({ error, success }: { error: string; success: string }) {
  if (error) return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
  if (success) return <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>
  return null
}

export function OrganizationsPanel({ organizations }: { organizations: OrganizationSummary[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function create(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await createOrganizationAction(formData)
    if (result.error) return setError(result.error)
    formRef.current?.reset()
    setSuccess('Organization created successfully.')
  }

  async function toggle(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await setOrganizationActiveAction(formData)
    if (result.error) return setError(result.error)
    setSuccess('Organization status updated.')
  }

  return (
    <div className="space-y-6">
      <Feedback error={error} success={success} />
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create organization</h2>
        <form ref={formRef} action={create} className="mt-5 grid gap-4 md:grid-cols-2">
          <input name="name" required maxLength={150} placeholder="Organization name" className="rounded-lg border p-3" />
          <input name="contact_email" type="email" placeholder="Contact email" className="rounded-lg border p-3" />
          <input name="contact_phone" maxLength={20} placeholder="Contact phone" className="rounded-lg border p-3" />
          <input name="address" placeholder="Address" className="rounded-lg border p-3" />
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 md:col-span-2">
            Create Organization
          </SubmitButton>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="p-4">Name</th><th className="p-4">Contact</th><th className="p-4">Address</th><th className="p-4">Status</th><th className="p-4">Action</th></tr>
          </thead>
          <tbody className="divide-y">
            {organizations.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No organizations created yet. Use the form above to add one.</td></tr>
            ) : organizations.map((organization) => (
              <tr key={organization.id}>
                <td className="p-4 font-medium text-gray-900">{organization.name}</td>
                <td className="p-4 text-gray-700">
                  <div>{organization.contact_email || '—'}</div>
                  <div className="text-gray-500">{organization.contact_phone || '—'}</div>
                </td>
                <td className="max-w-sm p-4 text-gray-700">{organization.address || '—'}</td>
                <td className="p-4">{organization.is_active ? 'Active' : 'Inactive'}</td>
                <td className="p-4">
                  <form action={toggle}>
                    <input type="hidden" name="id" value={organization.id} />
                    <input type="hidden" name="is_active" value={String(!organization.is_active)} />
                    <SubmitButton className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                      {organization.is_active ? 'Deactivate' : 'Activate'}
                    </SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export function SystemSettingsPanel({ settings }: { settings: SystemSettingSummary[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function create(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await createSystemSettingAction(formData)
    if (result.error) return setError(result.error)
    formRef.current?.reset()
    setSuccess('System setting created.')
  }

  async function update(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await updateSystemSettingAction(formData)
    if (result.error) return setError(result.error)
    setSuccess('System setting updated.')
  }

  return (
    <div className="space-y-6">
      <Feedback error={error} success={success} />
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create setting</h2>
        <form ref={formRef} action={create} className="mt-5 grid gap-4 md:grid-cols-3">
          <input name="setting_key" required maxLength={100} placeholder="Setting key" className="rounded-lg border p-3" />
          <input name="setting_value" placeholder="Value" className="rounded-lg border p-3" />
          <input name="description" placeholder="Description" className="rounded-lg border p-3" />
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 md:col-span-3">
            Create Setting
          </SubmitButton>
        </form>
      </section>

      <div className="space-y-3">
        {settings.length === 0 ? (
          <div className="rounded-xl border bg-white p-8 text-center text-gray-500 shadow-sm">No settings created yet.</div>
        ) : settings.map((setting) => (
          <form key={setting.id} action={update} className="grid gap-3 rounded-xl border bg-white p-5 shadow-sm md:grid-cols-[minmax(12rem,1fr)_2fr_2fr_auto]">
            <input type="hidden" name="id" value={setting.id} />
            <div>
              <p className="font-semibold text-gray-900">{setting.setting_key}</p>
              <p className="text-xs text-gray-500">Updated {new Date(setting.updated_at).toLocaleString()}</p>
            </div>
            <input name="setting_value" defaultValue={setting.setting_value || ''} placeholder="Value" className="rounded-lg border p-3" />
            <input name="description" defaultValue={setting.description || ''} placeholder="Description" className="rounded-lg border p-3" />
            <SubmitButton className="rounded-lg border border-blue-600 px-4 py-2 text-blue-700 hover:bg-blue-50">Save</SubmitButton>
          </form>
        ))}
      </div>
    </div>
  )
}

export function RoleGrantsPanel({ grants }: { grants: RoleGrantSummary[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function create(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await createRoleGrantAction(formData)
    if (result.error) return setError(result.error)
    formRef.current?.reset()
    setSuccess('Role permission granted.')
  }

  async function remove(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await deleteRoleGrantAction(formData)
    if (result.error) return setError(result.error)
    setSuccess('Role permission removed.')
  }

  return (
    <div className="space-y-6">
      <Feedback error={error} success={success} />
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Grant permission to a role</h2>
        <form ref={formRef} action={create} className="mt-5 grid gap-4 md:grid-cols-3">
          <select name="role" required className="rounded-lg border bg-white p-3">
            {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}
          </select>
          <select name="permission" required className="rounded-lg border bg-white p-3">
            {PERMISSION_OPTIONS.map((permission) => <option key={permission} value={permission}>{permission}</option>)}
          </select>
          <input name="description" placeholder="Description (optional)" className="rounded-lg border p-3" />
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 md:col-span-3">Grant Permission</SubmitButton>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-4">Role</th><th className="p-4">Permission</th><th className="p-4">Description</th><th className="p-4">Action</th></tr></thead>
          <tbody className="divide-y">
            {grants.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No dynamic role grants created yet.</td></tr>
            ) : grants.map((grant) => (
              <tr key={grant.id}>
                <td className="p-4 capitalize">{grant.role.replaceAll('_', ' ')}</td>
                <td className="p-4 font-mono text-xs">{grant.permission}</td>
                <td className="p-4 text-gray-600">{grant.description || '—'}</td>
                <td className="p-4">
                  <form action={remove}>
                    <input type="hidden" name="id" value={grant.id} />
                    <SubmitButton className="rounded-lg border border-red-300 px-3 py-2 text-red-700 hover:bg-red-50">Remove</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export function FeatureFlagsPanel({ flags }: { flags: FeatureFlagSummary[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function create(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await createFeatureFlagAction(formData)
    if (result.error) return setError(result.error)
    formRef.current?.reset()
    setSuccess('Feature flag created.')
  }

  async function toggle(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await setFeatureFlagEnabledAction(formData)
    if (result.error) return setError(result.error)
    setSuccess('Feature flag updated.')
  }

  return (
    <div className="space-y-6">
      <Feedback error={error} success={success} />
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create feature flag</h2>
        <form ref={formRef} action={create} className="mt-5 grid gap-4 md:grid-cols-3">
          <input name="feature_name" required maxLength={100} placeholder="Feature name" className="rounded-lg border p-3" />
          <input name="description" placeholder="Description" className="rounded-lg border p-3" />
          <label className="flex items-center gap-2 rounded-lg border p-3"><input name="is_enabled" type="checkbox" /> Enabled initially</label>
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700 md:col-span-3">Create Feature Flag</SubmitButton>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600"><tr><th className="p-4">Feature</th><th className="p-4">Description</th><th className="p-4">Status</th><th className="p-4">Action</th></tr></thead>
          <tbody className="divide-y">
            {flags.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No feature flags created yet.</td></tr>
            ) : flags.map((flag) => (
              <tr key={flag.id}>
                <td className="p-4 font-medium text-gray-900">{flag.feature_name}</td>
                <td className="p-4 text-gray-600">{flag.description || '—'}</td>
                <td className="p-4">{flag.is_enabled ? 'Enabled' : 'Disabled'}</td>
                <td className="p-4">
                  <form action={toggle}>
                    <input type="hidden" name="id" value={flag.id} />
                    <input type="hidden" name="is_enabled" value={String(!flag.is_enabled)} />
                    <SubmitButton className="rounded-lg border px-3 py-2 hover:bg-gray-50">{flag.is_enabled ? 'Disable' : 'Enable'}</SubmitButton>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
