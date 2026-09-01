'use client'

import { useMemo, useState } from 'react'
import { recordInvoicePaymentAction } from '@/app/actions/accountant'
import SubmitButton from '@/components/SubmitButton'
import type { Invoice } from '@/lib/accountantTypes'
import { money } from '@/lib/accountantTypes'

export default function InvoiceWorkspace({ invoices }: { invoices: Invoice[] }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const filtered = useMemo(() => invoices.filter(invoice => {
    const matchesStatus = status === 'all' || invoice.status === status
    const term = search.toLowerCase()
    return matchesStatus && (`${invoice.id} ${invoice.patient_name} ${invoice.receipt_no || ''}`).toLowerCase().includes(term)
  }), [invoices, search, status])
  async function pay(data: FormData) {
    setNotice(''); setError('')
    const result = await recordInvoicePaymentAction(data)
    if (result.error) setError(result.error); else setNotice('Payment recorded. The invoice and receipt are now locked.')
  }
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Invoice control</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Invoices</h1><p className="mt-1 text-slate-600">Review appointment-backed invoices and collect each pending amount only once.</p></div>{error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{notice && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}<div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search invoice, patient, receipt" className="rounded-xl border p-3"/><select value={status} onChange={event => setStatus(event.target.value)} className="rounded-xl border p-3"><option value="all">All statuses</option><option value="pending">Pending</option><option value="paid">Paid</option></select></div><section className="overflow-hidden rounded-2xl border bg-white shadow-sm">{filtered.length === 0 ? <p className="p-10 text-center text-slate-500">No invoices found.</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-4">Invoice / patient</th><th className="px-4 py-4">Appointment</th><th className="px-4 py-4">Amount</th><th className="px-4 py-4">Status / receipt</th><th className="px-4 py-4">Accounting operation</th></tr></thead><tbody className="divide-y">{filtered.map(invoice => <tr key={invoice.id}><td className="px-4 py-4"><p className="font-semibold">Invoice #{invoice.id}</p><p className="text-slate-600">{invoice.patient_name}</p></td><td className="px-4 py-4"><p>#{invoice.appointment_id}</p><p className="text-xs text-slate-500">{invoice.appointment_date}</p></td><td className="px-4 py-4 font-semibold">{money(invoice.amount)}</td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{invoice.status}</span><p className="mt-2 text-xs text-slate-500">{invoice.receipt_no || 'No receipt yet'}</p></td><td className="px-4 py-4">{invoice.status === 'pending' ? <form action={pay} className="flex min-w-[245px] gap-2"><input type="hidden" name="invoice_id" value={invoice.id}/><select name="payment_method" required className="rounded-lg border px-2"><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option></select><SubmitButton className="rounded-lg bg-blue-600 px-3 py-2 font-semibold text-white">Record payment</SubmitButton></form> : <span className="text-sm text-emerald-700">Paid {invoice.payment_method ? `by ${invoice.payment_method.toUpperCase()}` : ''}</span>}</td></tr>)}</tbody></table></div>}</section></div>
}
