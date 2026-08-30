import Link from 'next/link'
import { notFound } from 'next/navigation'

import { fetchAPI } from '@/lib/api'
import AdminPasswordResetForm from '@/components/AdminPasswordResetForm'

interface AdminDetail {
  id: number
  name: string
  email: string
  role: 'admin'
  is_active: boolean
  created_at: string
}

export default async function SuperAdminAdminDetail({ params }: { params: { id: string } }) {
  let account: AdminDetail
  try {
    account = await fetchAPI(`/super-admin/admins/${params.id}`) as AdminDetail
  } catch (error) {
    if (error instanceof Error && error.message.includes('404')) notFound()
    throw error
  }

  return (
    <div className="space-y-6">
      <Link href="/super-admin/admins" className="text-sm font-medium text-blue-600">← Back to administrators</Link>
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Administrator details</h1>
        <p className="mt-1 text-gray-600">Platform-managed hospital administrator account.</p>
      </div>
      <section className="max-w-2xl rounded-xl border bg-white p-6 shadow-sm">
        <dl className="grid gap-5 sm:grid-cols-2">
          <div><dt className="text-sm text-gray-500">Name</dt><dd className="mt-1 font-semibold text-gray-900">{account.name}</dd></div>
          <div><dt className="text-sm text-gray-500">Email</dt><dd className="mt-1 text-gray-900">{account.email}</dd></div>
          <div><dt className="text-sm text-gray-500">Role</dt><dd className="mt-1 capitalize text-gray-900">{account.role}</dd></div>
          <div><dt className="text-sm text-gray-500">Status</dt><dd className="mt-1 text-gray-900">{account.is_active ? 'Active' : 'Disabled'}</dd></div>
          <div><dt className="text-sm text-gray-500">User ID</dt><dd className="mt-1 text-gray-900">#{account.id}</dd></div>
          <div><dt className="text-sm text-gray-500">Created</dt><dd className="mt-1 text-gray-900">{new Date(account.created_at).toLocaleString()}</dd></div>
        </dl>
        <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Organization assignment will be added through the staged organization-scoping migration; it is intentionally not inferred today.</p>
      </section>
      <AdminPasswordResetForm adminId={account.id} />
    </div>
  )
}
