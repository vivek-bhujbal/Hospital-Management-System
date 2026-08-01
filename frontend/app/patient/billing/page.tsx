import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import BillingList from '@/components/BillingList'

export default async function PatientBilling() {
  const bills = await fetchAPI('/billing/me').catch(() => [])
  const settings = await fetchAPI('/admin/settings').catch(() => ({}))
  const patient = await fetchAPI('/patients/me').catch(() => ({}))
  const doctors = await fetchAPI('/doctors/').catch(() => [])
  const appointments = await fetchAPI('/appointments/me').catch(() => [])
  
  const totalDues = Array.isArray(bills) ? bills.filter((b: any) => b.status === 'pending').reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0) : 0

  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <h1 className="text-3xl font-bold text-gray-800">Billing & Dues</h1>
      
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <h2 className="text-xl font-bold text-red-700">Total Dues: ₹{totalDues.toFixed(2)}</h2>
      </div>

      <BillingList 
        bills={Array.isArray(bills) ? bills : []} 
        settings={settings} 
        patient={patient} 
        doctors={Array.isArray(doctors) ? doctors : []} 
        appointments={Array.isArray(appointments) ? appointments : []} 
      />
    </div>
  )
}
