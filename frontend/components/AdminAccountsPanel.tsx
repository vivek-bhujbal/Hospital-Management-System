'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'

import { createAdminAccountAction } from '@/app/actions/staff'
import { setAdminActiveAction } from '@/app/actions/superAdmin'
import SubmitButton from '@/components/SubmitButton'

export interface AccountSummary {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  profile_id: number | null
  created_at: string
}

export default function AdminAccountsPanel({ accounts }: { accounts: AccountSummary[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await createAdminAccountAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    formRef.current?.reset()
    setSuccess('Administrator created successfully.')
  }

  async function toggleStatus(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await setAdminActiveAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess('Administrator status updated.')
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Create administrator</h2>
        <p className="mt-1 text-sm text-gray-600">
          This creates an active, verified Admin account. Super Admin access is never granted here.
        </p>
        <form ref={formRef} action={submit} className="mt-5 grid gap-4 md:grid-cols-3">
          {error && <p className="md:col-span-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p className="md:col-span-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
          <input name="name" required maxLength={100} placeholder="Full name" className="rounded-lg border p-3" />
          <input name="email" required type="email" placeholder="Email address" className="rounded-lg border p-3" />
          <input name="password" required type="password" minLength={8} placeholder="Strong temporary password" className="rounded-lg border p-3" />
          <p className="md:col-span-2 text-xs text-gray-500">
            Use uppercase, lowercase, a number, and a special character. Share it securely; it is never returned by the API.
          </p>
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">
            Create Admin
          </SubmitButton>
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4">Created</th><th className="p-4">Actions</th></tr>
          </thead>
          <tbody className="divide-y">
            {accounts.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No administrators created yet.</td></tr>
            ) : accounts.map((account) => (
              <tr key={account.id}>
                <td className="p-4 font-medium text-gray-900">{account.name}</td>
                <td className="p-4 text-gray-700">{account.email}</td>
                <td className="p-4">{account.is_active ? 'Active' : 'Disabled'}</td>
                <td className="p-4 text-gray-600">{new Date(account.created_at).toLocaleString()}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/super-admin/admins/${account.id}`} className="rounded-lg border px-3 py-2 text-blue-700 hover:bg-blue-50">View</Link>
                    <form action={toggleStatus}>
                      <input type="hidden" name="id" value={account.id} />
                      <input type="hidden" name="is_active" value={String(!account.is_active)} />
                      <SubmitButton className="rounded-lg border px-3 py-2 hover:bg-gray-50">
                        {account.is_active ? 'Deactivate' : 'Activate'}
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
