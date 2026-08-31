'use client'

import { FormEvent, useState, useTransition } from 'react'
import { CheckCircle2, ReceiptIndianRupee } from 'lucide-react'

import { collectPaymentAction } from '@/app/actions/receptionist'
import { ReceptionAppointment, ReceptionBill, ReceptionPatient } from '@/lib/receptionistTypes'

interface BillingDeskProps {
  initialBills: ReceptionBill[]
  patients: ReceptionPatient[]
  appointments: ReceptionAppointment[]
}

export default function BillingDesk({ initialBills, patients, appointments }: BillingDeskProps) {
  const [bills, setBills] = useState(initialBills)
  const [pendingBillId, setPendingBillId] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [, startTransition] = useTransition()
  const patientNames = new Map(patients.map((patient) => [patient.id, patient.name]))
  const appointmentById = new Map(appointments.map((appointment) => [appointment.id, appointment]))

  function handleCollect(event: FormEvent<HTMLFormElement>, bill: ReceptionBill) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const method = formData.get('payment_method')?.toString().toUpperCase()
    if (!window.confirm(`Collect ₹${bill.amount} by ${method}?`)) return
    setPendingBillId(bill.id)
    setMessage(null)
    startTransition(() => {
      void (async () => {
        const result = await collectPaymentAction(formData)
        setPendingBillId(null)
        if (result.error || !result.data) {
          setMessage({ type: 'error', text: result.error || 'Payment collection failed' })
          return
        }
        setBills((current) => current.map((item) => item.id === bill.id
          ? { ...item, ...result.data, status: 'paid' }
          : item))
        setMessage({ type: 'success', text: `Payment collected. Receipt ${result.data.receipt_no}` })
      })()
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Payment desk</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Billing &amp; Payment</h1>
        <p className="mt-1 text-slate-600">View invoices, collect patient payments, and reference issued receipts.</p>
      </div>

      {message && <div role={message.type === 'error' ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${message.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>{message.text}</div>}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4">Invoice</th><th className="px-5 py-4">Patient</th><th className="px-5 py-4">Appointment</th><th className="px-5 py-4">Amount</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Date</th><th className="px-5 py-4">Details / receipt</th><th className="px-5 py-4 text-right">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bills.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500"><ReceiptIndianRupee className="mx-auto mb-3 h-8 w-8 text-slate-400" />No invoices found.</td></tr>}
              {bills.map((bill) => {
                const appointment = appointmentById.get(bill.appointment_id)
                return (
                  <tr key={bill.id} className="align-top hover:bg-slate-50">
                    <td className="px-5 py-4 font-semibold text-slate-900">#{bill.id}</td>
                    <td className="px-5 py-4 text-slate-800">{patientNames.get(bill.patient_id) || `Patient #${bill.patient_id}`}</td>
                    <td className="px-5 py-4 text-slate-700">#{bill.appointment_id}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">₹{bill.amount}</td>
                    <td className="px-5 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${bill.status === 'paid' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>{bill.status}</span></td>
                    <td className="px-5 py-4 text-sm text-slate-600">{new Date(bill.created_at).toLocaleDateString('en-IN')}</td>
                    <td className="px-5 py-4 text-sm">
                      <details>
                        <summary className="cursor-pointer font-medium text-blue-700">View bill</summary>
                        <div className="mt-2 min-w-52 space-y-1 text-slate-600">
                          <p>Appointment date: {appointment?.appt_date || '—'}</p>
                          <p>Payment method: {bill.payment_method?.toUpperCase() || 'Not paid'}</p>
                          {bill.receipt_no && <p className="font-semibold text-emerald-700">Receipt: {bill.receipt_no}</p>}
                          {bill.paid_at && <p>Paid: {new Date(bill.paid_at).toLocaleString('en-IN')}</p>}
                        </div>
                      </details>
                    </td>
                    <td className="px-5 py-4">
                      {bill.status === 'pending' ? (
                        <form onSubmit={(event) => handleCollect(event, bill)} className="flex justify-end gap-2">
                          <input type="hidden" name="id" value={bill.id} />
                          <select name="payment_method" required defaultValue="cash" className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option></select>
                          <button disabled={pendingBillId === bill.id} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">{pendingBillId === bill.id ? 'Collecting…' : 'Collect'}</button>
                        </form>
                      ) : (
                        <div className="flex justify-end gap-2 text-sm font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" />Paid</div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
