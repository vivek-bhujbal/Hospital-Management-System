import { cookies } from 'next/headers'
import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import AddEmployeeModal from './AddEmployeeModal'
import { updateEmployeeAction } from '@/app/actions/admin'

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
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Manage Receptionist/Employees</h1>
        <AddEmployeeModal />
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
            {employees.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No employees found.</td></tr>
            )}
            {employees.map((emp) => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{emp.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <form id={`employee-${emp.id}`} action={updateEmployeeAction}>
                    <input type="hidden" name="id" value={emp.id} />
                    <input form={`employee-${emp.id}`} name="designation" required defaultValue={emp.designation} className="w-40 rounded border p-2" aria-label="Designation" />
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
                  <select form={`employee-${emp.id}`} name="status" defaultValue={emp.status} className="rounded border bg-white p-2"><option value="active">Active</option><option value="inactive">Inactive</option></select>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-3">
                    <button form={`employee-${emp.id}`} className="rounded border px-3 py-2 text-blue-700 hover:bg-blue-50">Save</button>
                    <Link href={`/admin/employees/${emp.id}/permissions`} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900"><ShieldAlert className="w-4 h-4" /> Permissions</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
