'use client'

import { useRef, useState } from 'react'

import { resetAdminPasswordAction } from '@/app/actions/superAdmin'
import SubmitButton from '@/components/SubmitButton'

export default function AdminPasswordResetForm({ adminId }: { adminId: number }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(formData: FormData) {
    setError('')
    setSuccess('')
    const result = await resetAdminPasswordAction(formData)
    if (result.error) {
      setError(result.error)
      return
    }
    formRef.current?.reset()
    setSuccess('Administrator password reset successfully.')
  }

  return (
    <section className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Reset password</h2>
      <p className="mt-1 text-sm text-gray-600">
        Set a new temporary password for this administrator. Share it through a secure channel.
      </p>

      <form ref={formRef} action={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <input type="hidden" name="id" value={adminId} />
        <div>
          <label htmlFor="new_password" className="mb-1 block text-sm font-medium text-gray-700">
            New password
          </label>
          <input
            id="new_password"
            name="new_password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="w-full rounded-lg border p-3"
          />
        </div>
        <div>
          <label htmlFor="confirm_password" className="mb-1 block text-sm font-medium text-gray-700">
            Confirm new password
          </label>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            maxLength={72}
            autoComplete="new-password"
            className="w-full rounded-lg border p-3"
          />
        </div>

        <p className="sm:col-span-2 text-xs text-gray-500">
          Use at least 8 characters with uppercase, lowercase, a number, and a special character.
        </p>
        <div aria-live="polite" className="sm:col-span-2">
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {success && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</p>}
        </div>
        <div className="sm:col-span-2">
          <SubmitButton className="rounded-lg bg-blue-600 px-5 py-3 text-white hover:bg-blue-700">
            Reset password
          </SubmitButton>
        </div>
      </form>
    </section>
  )
}
