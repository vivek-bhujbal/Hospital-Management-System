import ClientForm from '@/components/ClientForm'
import SubmitButton from '@/components/SubmitButton'
import AutoRefresh from '@/components/AutoRefresh'
import { fetchAPI } from '@/lib/api'
import { collectPaymentAction } from '@/app/actions/receptionist'

export default async function ReceptionistBilling() {
  const bills = await fetchAPI('/billing/')
  const settings = await fetchAPI('/admin/settings')

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <AutoRefresh interval={5000} />
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Billing Desk</h1>
        <p className="text-gray-400 mt-1 text-sm">Manage pending and recently paid patient invoices.</p>
      </div>
      
      <div className="bg-[#1C1F22] rounded-2xl shadow-xl border border-[#2A2E33] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#2A2E33]">
            <thead className="bg-[#111315]">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Patient ID</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action / Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2A2E33] bg-[#1C1F22]">
              {bills.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-8 text-center text-gray-500">No invoices found.</td>
                </tr>
              )}
              {bills.map((b: any) => (
                <tr key={b.id} className="hover:bg-[#25282D] transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap text-white font-medium">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-gray-300">#{b.patient_id}</td>
                  <td className="px-8 py-5 whitespace-nowrap font-bold text-white">${b.amount}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${b.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    {b.status === 'pending' ? (
                      <ClientForm action={collectPaymentAction} className="flex gap-3 items-center">
                        <input type="hidden" name="id" value={b.id} />
                        <select name="payment_method" required className="bg-[#111315] border border-[#2A2E33] text-white p-1.5 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                          <option value="cash">Cash</option>
                          <option value="card">Card</option>
                          <option value="upi">UPI</option>
                        </select>
                        <SubmitButton className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors shadow-md shadow-blue-500/20">
                          Collect
                        </SubmitButton>
                      </ClientForm>
                    ) : (
                      <div className="text-sm">
                        <p className="font-semibold text-emerald-400">{b.receipt_no}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          {settings?.hospital_name || 'Hospital'} | GSTIN: {settings?.gstin || 'N/A'}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
