import Link from 'next/link'

import { fetchAPI } from '@/lib/api'

interface HealthSummary {
  database: string
  redis: string
  checked_at: string
}

export default async function SuperAdminDashboard() {
  const [organizations, admins, grants, settings, flags, health] = await Promise.all([
    fetchAPI('/super-admin/hospitals') as Promise<unknown[]>,
    fetchAPI('/super-admin/admins') as Promise<unknown[]>,
    fetchAPI('/super-admin/roles-permissions') as Promise<unknown[]>,
    fetchAPI('/super-admin/settings') as Promise<unknown[]>,
    fetchAPI('/super-admin/features') as Promise<unknown[]>,
    fetchAPI('/super-admin/system-health') as Promise<HealthSummary>,
  ])

  const cards = [
    ['Organizations', organizations.length, '/super-admin/hospitals'],
    ['Administrators', admins.length, '/super-admin/admins'],
    ['Role grants', grants.length, '/super-admin/permissions'],
    ['System settings', settings.length, '/super-admin/settings'],
    ['Feature flags', flags.length, '/super-admin/features'],
  ] as const

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Super Admin overview</h1>
        <p className="mt-1 text-gray-600">Manage organizations, access controls, platform settings, and system health.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, count, path]) => (
          <Link key={path} href={path} className="rounded-xl border bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{count}</p>
            <p className="mt-3 text-sm text-blue-600">Open management →</p>
          </Link>
        ))}
      </div>
      <section className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">System status</h2>
            <p className="mt-1 text-sm text-gray-500">Checked {new Date(health.checked_at).toLocaleString()}</p>
          </div>
          <Link href="/super-admin/system-health" className="text-sm font-medium text-blue-600 hover:text-blue-700">View details</Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {(['database', 'redis'] as const).map((service) => (
            <div key={service} className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
              <span className="font-medium capitalize text-gray-700">{service}</span>
              <span className={health[service] === 'available' ? 'font-semibold text-green-700' : 'font-semibold text-red-700'}>{health[service]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
