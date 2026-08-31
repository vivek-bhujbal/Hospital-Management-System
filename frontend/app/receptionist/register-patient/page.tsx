import { PERMISSIONS } from '@/lib/permissions'
import { requirePermission } from '@/lib/serverPermissions'
import RegisterPatientForm from './RegisterPatientForm'

export default async function RegisterPatientPage() {
  await requirePermission(PERMISSIONS.PATIENTS_CREATE, '/receptionist/home')
  return <RegisterPatientForm />
}
