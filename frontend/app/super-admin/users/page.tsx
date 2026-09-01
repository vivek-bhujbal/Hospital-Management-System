import DataTable from '@/components/ui/DataTable'
import { PageHeader } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'

interface SystemUserSummary { id: number; name: string; email: string; role: string; is_active: boolean; created_at: string }

function roleLabel(role: string) {
  return role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

export default async function SuperAdminUsers() {
  const users = await fetchAPI('/super-admin/users') as SystemUserSummary[]
  const records = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: roleLabel(user.role),
    status: user.is_active ? 'Active' : 'Disabled',
    created: new Date(user.created_at).toLocaleString(),
  }))
  return <div className="space-y-6"><PageHeader eyebrow="Access governance" title="All system users" description="Read-only account directory across every role, including the environment-owned Super Administrator." /><DataTable records={records} columns={['id', 'name', 'email', 'role', 'status', 'created']} label="System users" /></div>
}
