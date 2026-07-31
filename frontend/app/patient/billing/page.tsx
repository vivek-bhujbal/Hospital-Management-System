import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'

export default async function PatientBilling() {
  const bills = await fetchAPI('/billing/me')
  const totalDues = bills.filter((b: any) => b.status === 'pending').reduce((sum: number, b: any) => sum + parseFloat(b.amount), 0)

  return (
    <div className="space-y-6">
      <AutoRefresh interval={5000} />
      <h1 className="text-3xl font-bold text-gray-800">Billing & Dues</h1>
      
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <h2 className="text-xl font-bold text-red-700">Total Dues: ${totalDues.toFixed(2)}</h2>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Invoice History</h2>
        {bills.length === 0 ? (
          <p className="text-gray-500">No bills found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map((b: any) => (
                <tr key={b.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">${b.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{b.payment_method || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
