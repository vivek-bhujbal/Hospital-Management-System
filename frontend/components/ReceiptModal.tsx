'use client'

import { Printer } from 'lucide-react'

import { Modal } from '@/components/ui/Modal'

export default function ReceiptModal({ bill, settings, patient, doctorName, onClose }: { bill: any; settings: any; patient: any; doctorName: string; onClose: () => void }) {
  if (!bill) return null
  const totalAmount = Number(bill.amount)
  const registrationFee = 50
  const consultationFee = totalAmount > registrationFee ? totalAmount - registrationFee : totalAmount
  const paidAt = bill.paid_at || bill.created_at
  const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

  return <Modal open title="Payment receipt" description="Official record of this hospital payment." onClose={onClose} size="sm" footer={<><button type="button" onClick={onClose} className="hms-button hms-button-secondary">Close</button><button type="button" onClick={() => window.print()} className="hms-button hms-button-primary"><Printer className="h-4 w-4" />Print receipt</button></>}>
    <div className="rounded-xl border bg-[var(--hms-surface-muted)]">
      <header className="border-b border-dashed px-5 py-5 text-center"><h3 className="font-bold text-slate-900 dark:text-slate-100">{settings?.hospital_name || 'Hospital'}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{settings?.address || 'Hospital address'}<br />Phone: {settings?.phone || 'Not available'} · GSTIN: {settings?.gstin || 'Not available'}</p></header>
      <div className="bg-[var(--hms-surface)] px-5 py-5">
        <div className="flex justify-between gap-5 text-sm"><div><p className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">Receipt number</p><p className="mt-1 font-semibold">{bill.receipt_no || 'Not assigned'}</p></div><div className="text-right"><p className="text-[0.68rem] font-bold uppercase tracking-wide text-slate-400">Paid at</p><p className="mt-1 font-semibold">{new Date(paidAt).toLocaleString('en-IN')}</p></div></div>
        <dl className="mt-5 space-y-2 rounded-xl bg-[var(--hms-surface-muted)] p-4 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-500">Patient</dt><dd className="font-semibold text-right">{patient?.name || 'Not available'}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Patient ID</dt><dd className="font-semibold">HMS-{patient?.id || 'N/A'}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-500">Doctor</dt><dd className="font-semibold text-right">Dr. {doctorName}</dd></div></dl>
        <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-slate-600">Consultation fee</dt><dd className="font-medium">{currency.format(consultationFee)}</dd></div><div className="flex justify-between"><dt className="text-slate-600">Registration charge</dt><dd className="font-medium">{currency.format(registrationFee)}</dd></div><div className="flex justify-between border-t border-dashed pt-4 text-base"><dt className="font-bold">Total paid</dt><dd className="font-bold text-brand-800 dark:text-brand-300">{currency.format(totalAmount)}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Payment method</dt><dd className="font-semibold capitalize">{bill.payment_method || 'Cash'}</dd></div></dl>
      </div>
      <footer className="border-t border-dashed px-5 py-4 text-center text-xs leading-5 text-slate-500">Thank you for choosing {settings?.hospital_name || 'our hospital'}.<br />Collected by reception desk {bill.collected_by || ''}</footer>
    </div>
  </Modal>
}
