import { ReceiptIndianRupee } from 'lucide-react'

import AutoRefresh from '@/components/AutoRefresh'
import BillingList from '@/components/BillingList'
import { PageHeader, StatCard } from '@/components/ui/HmsUI'
import { fetchAPI } from '@/lib/api'

export default async function PatientBilling() {
  const [bills, settings, patient, doctors, appointments] = await Promise.all([
    fetchAPI('/billing/me').catch(() => []),
    fetchAPI('/admin/settings').catch(() => ({})),
    fetchAPI('/patients/me').catch(() => ({})),
    fetchAPI('/doctors/').catch(() => []),
    fetchAPI('/appointments/me').catch(() => []),
  ])
  const totalDues = Array.isArray(bills) ? bills.filter((bill: any) => bill.status === 'pending').reduce((sum: number, bill: any) => sum + Number(bill.amount), 0) : 0

  return <div className="space-y-6">
    <AutoRefresh interval={30000} />
    <PageHeader eyebrow="My account" title="Bills and payments" description="Review charges, outstanding balances, payment status, and receipts." />
    <div className="max-w-sm"><StatCard label="Total outstanding" value={`₹${totalDues.toFixed(2)}`} icon={ReceiptIndianRupee} tone={totalDues > 0 ? 'warning' : 'success'} helper={totalDues > 0 ? 'Payment is still pending' : 'No outstanding balance'} /></div>
    <BillingList bills={Array.isArray(bills) ? bills : []} settings={settings} patient={patient} doctors={Array.isArray(doctors) ? doctors : []} appointments={Array.isArray(appointments) ? appointments : []} />
  </div>
}
