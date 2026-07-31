import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'

export default async function AdminBilling() {
  const report = await fetchAPI('/admin/billing/report')

  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <h1 className="text-3xl font-bold text-gray-800">Financial Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-green-700">Total Collected Revenue</h2>
          <p className="text-4xl font-bold text-green-700">${report.paid_total.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 text-red-600">Pending Dues</h2>
          <p className="text-4xl font-bold text-red-600">${report.pending_total.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Recent Transactions</h2>
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {report.recent_transactions.map((t: any) => (
              <tr key={t.id}>
                <td className="px-6 py-4 whitespace-nowrap">{new Date(t.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap">#{t.patient_id}</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">${t.amount}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${t.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap capitalize">{t.payment_method || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-500">{t.receipt_no || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
