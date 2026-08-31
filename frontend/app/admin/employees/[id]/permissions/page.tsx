import { cookies } from 'next/headers'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { updateEmployeePermissionsAction } from '@/app/actions/admin'
import SubmitButton from '@/components/SubmitButton'

async function getEmployee(id: string) {
  const token = cookies().get('token')?.value
  const apiUrl = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const res = await fetch(`${apiUrl}/admin/employees/`, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  })
  if (!res.ok) return null
  const employees = await res.json()
  return employees.find((e: any) => e.id === parseInt(id))
}

export default async function EditPermissionsPage({ params }: { params: { id: string } }) {
  const employee = await getEmployee(params.id)
  
  if (!employee) {
    return <div className="p-8 text-center">Employee not found.</div>
  }

  const perms = employee.permissions || {}

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/employees" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to Employees
      </Link>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{employee.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{employee.designation} • {employee.email}</p>
          </div>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
            Manage Permissions
          </span>
        </div>

        <form action={updateEmployeePermissionsAction as any} className="p-6">
          <input type="hidden" name="id" value={employee.id} />
          
          <div className="space-y-6">
            <PermissionToggle 
              name="can_register_patient" 
              label="Register Patients" 
              description="Allow employee to add new patients to the system."
              defaultChecked={perms.can_register_patient}
            />
            <PermissionToggle 
              name="can_schedule_appointment" 
              label="Schedule Appointments" 
              description="Allow employee to book and confirm doctor appointments."
              defaultChecked={perms.can_schedule_appointment}
            />
            <PermissionToggle 
              name="can_checkin_patient" 
              label="Check-in Patients" 
              description="Allow employee to mark patients as arrived for their appointment."
              defaultChecked={perms.can_checkin_patient}
            />
            <PermissionToggle 
              name="can_collect_billing" 
              label="Collect Payments" 
              description="Allow employee to process and collect patient bills."
              defaultChecked={perms.can_collect_billing}
            />
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
            <SubmitButton className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2">
              Save Permissions
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  )
}

function PermissionToggle({ name, label, description, defaultChecked }: any) {
  return (
    <div className="flex items-start justify-between p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
      <div className="flex-1 pr-4">
        <h3 className="text-base font-medium text-gray-900">{label}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <div className="flex items-center h-full pt-1">
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" name={name} defaultChecked={defaultChecked} className="sr-only peer" />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        </label>
      </div>
    </div>
  )
}
