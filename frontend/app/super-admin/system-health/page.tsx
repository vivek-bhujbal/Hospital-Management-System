import { fetchAPI } from '@/lib/api'

interface SystemHealth {
  backend: string
  database: string
  redis: string
  checked_at: string
}

export default async function SuperAdminHealth() {
  const health = await fetchAPI('/super-admin/system-health') as SystemHealth
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System health</h1>
        <p className="mt-1 text-gray-600">Live availability checks from the backend service.</p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        {(['backend', 'database', 'redis'] as const).map((service) => (
          <section key={service} className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm font-medium capitalize text-gray-500">{service}</p>
            <p className={health[service] === 'available' ? 'mt-3 text-2xl font-bold text-green-700' : 'mt-3 text-2xl font-bold text-red-700'}>{health[service]}</p>
          </section>
        ))}
      </div>
      <p className="text-sm text-gray-500">Checked {new Date(health.checked_at).toLocaleString()}</p>
    </div>
  )
}
