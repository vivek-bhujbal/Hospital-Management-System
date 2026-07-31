import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export function requirePermission(permissionKey: string) {
  const permStr = cookies().get('employee_permissions')?.value
  if (!permStr) return // If no permissions string, maybe allow or deny? Better to allow by default if admin/not set, but since it's receptionist we check explicitly.

  try {
    const permissions = JSON.parse(permStr)
    if (permissions[permissionKey] === false) {
      redirect('/receptionist/home')
    }
  } catch (e) {
    // Ignore parse error
  }
}
