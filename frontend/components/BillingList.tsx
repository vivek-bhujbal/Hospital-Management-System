'use client'

import { useState } from 'react'
import ReceiptModal from './ReceiptModal'

export default function BillingList({ 
  bills, 
  settings, 
  patient,
  doctors,
  appointments
}: { 
  bills: any[], 
  settings: any, 
  patient: any,
  doctors: any[],
  appointments: any[]
}) {
  const [selectedBill, setSelectedBill] = useState<any>(null)

  const getDoctorName = (bill: any) => {
    const appt = appointments.find((a: any) => a.id === bill.appointment_id)
    if (!appt) return 'N/A'
    const doctor = doctors.find((d: any) => d.id === appt.doctor_id)
    return doctor ? doctor.name : 'N/A'
  }

  return (
    <>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map((b: any) => (
                <tr 
                  key={b.id} 
                  className={b.status === 'paid' ? 'hover:bg-gray-50 transition-colors' : ''}
                >
                  <td className="px-6 py-4 whitespace-nowrap">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">₹{b.amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${b.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap capitalize">{b.payment_method || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {b.status === 'paid' ? (
                      <button 
                        onClick={() => setSelectedBill(b)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-md text-sm font-medium transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedBill && (
        <ReceiptModal 
          bill={selectedBill} 
          settings={settings} 
          patient={patient} 
          doctorName={getDoctorName(selectedBill)} 
          onClose={() => setSelectedBill(null)} 
        />
      )}
    </>
  )
}
