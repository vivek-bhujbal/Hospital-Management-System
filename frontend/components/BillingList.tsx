'use client'

import { Eye } from 'lucide-react'
import { useState } from 'react'

import ReceiptModal from './ReceiptModal'
import { EmptyState, StatusBadge } from './ui/HmsUI'

export default function BillingList({ bills, settings, patient, doctors, appointments }: { bills: any[]; settings: any; patient: any; doctors: any[]; appointments: any[] }) {
  const [selectedBill, setSelectedBill] = useState<any>(null)
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
  const getDoctorName = (bill: any) => {
    const appointment = appointments.find((item: any) => item.id === bill.appointment_id)
    const doctor = doctors.find((item: any) => item.id === appointment?.doctor_id)
    return doctor?.name || 'Not available'
  }

  return <>
    <section className="hms-card overflow-hidden">
      <header className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Invoice history</h2><p className="mt-1 text-sm text-slate-500">Every hospital charge and its current payment status.</p></header>
      {bills.length === 0 ? <EmptyState title="No bills found" description="Your hospital invoices and receipts will appear here." /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Amount</th><th className="px-5 py-3 text-left">Status</th><th className="px-5 py-3 text-left">Method</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody className="divide-y">{bills.map((bill: any) => <tr key={bill.id}><td className="whitespace-nowrap px-5 py-4">{new Date(bill.created_at).toLocaleDateString('en-IN')}</td><td className="whitespace-nowrap px-5 py-4 font-semibold">{currency.format(Number(bill.amount))}</td><td className="whitespace-nowrap px-5 py-4"><StatusBadge status={bill.status} /></td><td className="whitespace-nowrap px-5 py-4 capitalize">{bill.payment_method || 'Not paid'}</td><td className="whitespace-nowrap px-5 py-4 text-right">{bill.status === 'paid' ? <button type="button" onClick={() => setSelectedBill(bill)} className="hms-button hms-button-secondary min-h-9 px-3 py-1.5"><Eye className="h-4 w-4" />Receipt</button> : <span className="text-slate-400">—</span>}</td></tr>)}</tbody></table></div>}
    </section>
    {selectedBill && <ReceiptModal bill={selectedBill} settings={settings} patient={patient} doctorName={getDoctorName(selectedBill)} onClose={() => setSelectedBill(null)} />}
  </>
}
