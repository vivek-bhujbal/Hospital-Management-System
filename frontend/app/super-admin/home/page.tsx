import Link from 'next/link'

import { fetchAPI } from '@/lib/api'

interface ActivitySummary {
  id: number
  actor_user_id: number | null
  action: string
  resource_type: string
  resource_id: string | null
  created_at: string
}

interface PlatformOverview {
  total_organizations: number
  total_admins: number
  active_admins: number
  total_users: number
  role_permission_grants: number
  system_settings: number
  feature_flags: number
  recent_activity: ActivitySummary[]
  health: {
    backend: string
    database: string
    redis: string
    checked_at: string
  }
}

export default async function SuperAdminDashboard() {
  const overview = await fetchAPI('/super-admin/overview') as PlatformOverview
  const cards = [
    ['Organizations', overview.total_organizations, '/super-admin/hospitals'],
    ['Administrators', overview.total_admins, '/super-admin/admins'],
    ['Active admins', overview.active_admins, '/super-admin/admins'],
    ['Total users', overview.total_users, '/super-admin/users'],
    ['Role grants', overview.role_permission_grants, '/super-admin/permissions'],
    ['System settings', overview.system_settings, '/super-admin/settings'],
    ['Feature flags', overview.feature_flags, '/super-admin/features'],
  ] as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform dashboard</h1>
        <p className="mt-1 text-gray-600">Global organizations, administrators, access controls, and platform health.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, count, path]) => (
          <Link key={label} href={path} className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{count}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b p-5">
            <h2 className="text-xl font-semibold text-gray-900">Recent system activity</h2>
            <Link href="/super-admin/audit-logs" className="text-sm font-medium text-blue-600">View audit logs</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr><th className="p-4">Actor</th><th className="p-4">Action</th><th className="p-4">Resource</th><th className="p-4">Time</th></tr>
              </thead>
              <tbody className="divide-y">
                {overview.recent_activity.length === 0 ? (
                  <tr><td colSpan={4} className="p-8 text-center text-gray-500">No audit activity yet.</td></tr>
                ) : overview.recent_activity.map((event) => (
                  <tr key={event.id}>
                    <td className="p-4">{event.actor_user_id ? `User #${event.actor_user_id}` : 'System'}</td>
                    <td className="p-4 font-medium text-gray-900">{event.action}</td>
                    <td className="p-4 text-gray-600">{event.resource_type}{event.resource_id ? ` #${event.resource_id}` : ''}</td>
                    <td className="p-4 whitespace-nowrap text-gray-600">{new Date(event.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">System health</h2>
            <Link href="/super-admin/system-health" className="text-sm font-medium text-blue-600">Details</Link>
          </div>
          <p className="mt-1 text-xs text-gray-500">Checked {new Date(overview.health.checked_at).toLocaleString()}</p>
          <div className="mt-5 space-y-3">
            {(['backend', 'database', 'redis'] as const).map((service) => (
              <div key={service} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <span className="font-medium capitalize text-gray-700">{service}</span>
                <span className={overview.health[service] === 'available' ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>{overview.health[service]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
