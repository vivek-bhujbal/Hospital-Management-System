import { fetchAPI } from '@/lib/api'

interface SystemUserSummary {
  id: number
  name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

function roleLabel(role: string): string {
  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default async function SuperAdminUsers() {
  const users = await fetchAPI('/super-admin/users') as SystemUserSummary[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">All system users</h1>
        <p className="mt-1 text-gray-600">
          Read-only account directory across every role, including the environment-owned Super Admin.
        </p>
      </div>

      <section className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4 text-sm text-gray-600">
          {users.length} {users.length === 1 ? 'account' : 'accounts'} in the system
        </div>
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Status</th>
              <th className="p-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">No user accounts found.</td>
              </tr>
            ) : users.map((user) => (
              <tr key={user.id}>
                <td className="p-4 font-medium text-gray-900">{user.name}</td>
                <td className="p-4 text-gray-700">{user.email}</td>
                <td className="p-4">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                    {roleLabel(user.role)}
                  </span>
                </td>
                <td className="p-4">
                  <span className={user.is_active ? 'font-medium text-green-700' : 'font-medium text-red-700'}>
                    {user.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="p-4 whitespace-nowrap text-gray-600">
                  {new Date(user.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
