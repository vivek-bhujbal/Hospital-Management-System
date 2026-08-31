import { fetchAPI } from '@/lib/api'
import { ManagerDepartment, ManagerDepartmentStats, statusLabel } from '@/lib/managerTypes'

export default async function ManagerDepartments() {
  const [departments, statistics] = await Promise.all([
    fetchAPI('/manager/departments') as Promise<ManagerDepartment[]>,
    fetchAPI('/manager/analytics/departments') as Promise<ManagerDepartmentStats[]>,
  ])
  const statisticsById = new Map(statistics.map((item) => [item.department_id, item]))

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Hospital structure</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Departments</h1>
        <p className="mt-1 text-slate-600">Read-only department status, doctor allocation, and appointment activity.</p>
      </div>
      {departments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">No departments configured.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-4">Department</th><th className="px-6 py-4">Description</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Doctors</th><th className="px-6 py-4">Appointments</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{departments.map((department) => {
            const stats = statisticsById.get(department.department_id)
            return <tr key={department.department_id} className="hover:bg-slate-50"><td className="px-6 py-4 font-semibold text-slate-900">{department.name}</td><td className="max-w-xl px-6 py-4 text-slate-700">{department.description || 'No description'}</td><td className="px-6 py-4 capitalize text-slate-700">{statusLabel(department.status)}</td><td className="px-6 py-4 text-slate-700">{stats?.doctor_count || 0}</td><td className="px-6 py-4 text-slate-700">{stats?.appointment_count || 0}</td></tr>
          })}</tbody>
        </table></div></div>
      )}
    </div>
  )
}
