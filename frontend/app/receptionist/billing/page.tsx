import { fetchAPI } from '@/lib/api'
import { PERMISSIONS } from '@/lib/permissions'
import { ReceptionAppointment, ReceptionBill, ReceptionPatient } from '@/lib/receptionistTypes'
import { requirePermission } from '@/lib/serverPermissions'
import BillingDesk from './BillingDesk'

export default async function ReceptionistBillingPage() {
  await requirePermission(PERMISSIONS.BILLING_COLLECT, '/receptionist/home')
  const [bills, patients, appointments] = await Promise.all([
    fetchAPI('/billing/') as Promise<ReceptionBill[]>,
    fetchAPI('/patients/') as Promise<ReceptionPatient[]>,
    fetchAPI('/appointments/') as Promise<ReceptionAppointment[]>,
  ])
  return <BillingDesk initialBills={bills} patients={patients} appointments={appointments} />
}
