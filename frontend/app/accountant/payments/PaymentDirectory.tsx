'use client'

import { useMemo, useState } from 'react'
import type { Payment } from '@/lib/accountantTypes'
import { money } from '@/lib/accountantTypes'

export default function PaymentDirectory({ payments }: { payments: Payment[] }) {
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('all')
  const filtered = useMemo(() => payments.filter(payment => {
    const term = search.toLowerCase()
    return (method === 'all' || payment.payment_method === method) && (`${payment.id} ${payment.invoice_id} ${payment.patient_name} ${payment.receipt_no}`).toLowerCase().includes(term)
  }), [payments, search, method])
  return <div className="space-y-6"><div><p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Immutable receipts</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Payments</h1><p className="mt-1 text-slate-600">Invoice-backed payment ledger with collector and receipt traceability.</p></div><div className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2"><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search payment, invoice, patient, receipt" className="rounded-xl border p-3"/><select value={method} onChange={event => setMethod(event.target.value)} className="rounded-xl border p-3"><option value="all">All methods</option><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option></select></div><section className="overflow-hidden rounded-2xl border bg-white shadow-sm">{filtered.length === 0 ? <p className="p-10 text-center text-slate-500">No real payments have been recorded.</p> : <div className="overflow-x-auto"><table className="min-w-full divide-y text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-4">Payment</th><th className="px-4 py-4">Invoice / patient</th><th className="px-4 py-4">Amount / method</th><th className="px-4 py-4">Date</th><th className="px-4 py-4">Collector / receipt</th></tr></thead><tbody className="divide-y">{filtered.map(payment => <tr key={payment.id}><td className="px-4 py-4 font-semibold">#{payment.id}</td><td className="px-4 py-4"><p>Invoice #{payment.invoice_id}</p><p className="text-slate-600">{payment.patient_name}</p></td><td className="px-4 py-4"><p className="font-semibold">{money(payment.amount)}</p><p className="text-xs uppercase text-slate-500">{payment.payment_method}</p></td><td className="px-4 py-4">{new Date(payment.payment_date).toLocaleString()}</td><td className="px-4 py-4"><p>{payment.collector_name}</p><p className="text-xs font-medium text-blue-700">{payment.receipt_no}</p></td></tr>)}</tbody></table></div>}</section></div>
}
