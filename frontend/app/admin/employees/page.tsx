import { cookies } from 'next/headers'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import AddEmployeeModal from './AddEmployeeModal'
import EmployeeStatusSelect from './EmployeeStatusSelect'
import { updateEmployeeAction } from '@/app/actions/admin'
import { EmptyState, PageHeader } from '@/components/ui/HmsUI'

interface EmployeeSummary {
  id: number
  name: string | null
  email: string | null
  designation: string
  shift_start: string | null
  shift_end: string | null
  status: 'active' | 'inactive'
}

async function getEmployees() {
  const token = cookies().get('token')?.value
  const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const res = await fetch(`${apiUrl}/admin/employees/`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  })
  if (!res.ok) return []
  return res.json()
}

export default async function EmployeesPage() {
  const employees = await getEmployees() as EmployeeSummary[]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Administration" title="Receptionist employees" description="Maintain front-desk employee profiles, shifts, status, and scoped permissions." actions={<AddEmployeeModal />} />

      <div className="hms-card overflow-hidden">
        {employees.length === 0 ? <EmptyState title="No employees found" description="Create the first receptionist employee to begin managing front-desk operations." /> : <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Designation</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <form id={`employee-${emp.id}`} action={updateEmployeeAction}>
                    <input type="hidden" name="id" value={emp.id} />
                    <input form={`employee-${emp.id}`} name="designation" required defaultValue={emp.designation} className="hms-input w-44" aria-label="Designation" />
                  </form>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <input form={`employee-${emp.id}`} name="shift_start" type="time" defaultValue={emp.shift_start || ''} className="rounded border p-2" aria-label="Shift start" />
                    <span>–</span>
                    <input form={`employee-${emp.id}`} name="shift_end" type="time" defaultValue={emp.shift_end || ''} className="rounded border p-2" aria-label="Shift end" />
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <EmployeeStatusSelect employeeId={emp.id} status={emp.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-3">
                    <button form={`employee-${emp.id}`} className="hms-button hms-button-secondary">Save</button>
                    <Link href={`/admin/employees/${emp.id}/permissions`} className="hms-button hms-button-secondary"><ShieldAlert className="h-4 w-4" />Permissions</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>}
      </div>
    </div>
  )
}
