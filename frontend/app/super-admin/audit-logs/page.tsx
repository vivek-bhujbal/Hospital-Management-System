import Link from 'next/link'

import { fetchAPI } from '@/lib/api'

interface AuditEvent {
  id: number
  actor_user_id: number | null
  action: string
  resource_type: string
  resource_id: string | null
  created_at: string
}

export default async function SuperAdminAuditLogs({
  searchParams,
}: {
  searchParams?: { page?: string }
}) {
  const parsedPage = Number(searchParams?.page || '1')
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const limit = 25
  const events = await fetchAPI(`/super-admin/audit-logs?limit=${limit}&skip=${(page - 1) * limit}`) as AuditEvent[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform audit logs</h1>
        <p className="mt-1 text-gray-600">Immutable platform activity ordered newest first.</p>
      </div>
      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr><th className="p-4">Actor</th><th className="p-4">Action</th><th className="p-4">Resource</th><th className="p-4">Timestamp</th></tr>
          </thead>
          <tbody className="divide-y">
            {events.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No audit events on this page.</td></tr>
            ) : events.map((event) => (
              <tr key={event.id}>
                <td className="p-4">{event.actor_user_id ? `User #${event.actor_user_id}` : 'System'}</td>
                <td className="p-4 font-medium text-gray-900">{event.action}</td>
                <td className="p-4 text-gray-600">{event.resource_type}{event.resource_id ? ` #${event.resource_id}` : ''}</td>
                <td className="p-4 whitespace-nowrap text-gray-600">{new Date(event.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="flex items-center justify-between">
        {page > 1 ? <Link className="rounded-lg border px-4 py-2" href={`?page=${page - 1}`}>Previous</Link> : <span />}
        <span className="text-sm text-gray-600">Page {page}</span>
        {events.length === limit ? <Link className="rounded-lg border px-4 py-2" href={`?page=${page + 1}`}>Next</Link> : <span />}
      </div>
    </div>
  )
}
