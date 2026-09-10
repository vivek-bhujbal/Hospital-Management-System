'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'

import { prescriptionAction } from '@/app/actions/pharmacist'
import { useToast } from '@/components/ToastProvider'
import { ConfirmationDialog } from '@/components/ui/Modal'
import type { PharmacyPrescription } from '@/lib/pharmacistTypes'

type ReviewAction = 'verify' | 'reject' | 'mark_for_dispensing'

export default function ReviewActions({ prescription }: { prescription: PharmacyPrescription }) {
  const [action, setAction] = useState<ReviewAction | null>(null)
  const [pending, setPending] = useState(false)
  const [reasonError, setReasonError] = useState('')
  const reasonRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const { showToast } = useToast()

  function requestAction(nextAction: ReviewAction) {
    if (nextAction === 'reject' && !reasonRef.current?.value.trim()) {
      setReasonError('A rejection reason is required.')
      reasonRef.current?.focus()
      return
    }
    setReasonError('')
    setAction(nextAction)
  }

  async function confirmAction() {
    if (!action || pending) return
    setPending(true)
    const data = new FormData()
    data.set('prescription_id', String(prescription.id))
    data.set('action', action)
    if (action === 'reject') data.set('reason', reasonRef.current?.value.trim() || '')
    try {
      const response = await prescriptionAction(data)
      if (response.error) {
        showToast(response.error, 'error')
        return
      }
      showToast(
        action === 'verify'
          ? 'Prescription verified.'
          : action === 'reject'
            ? 'Prescription rejected with the recorded reason.'
            : 'Prescription marked ready for dispensing.',
        'success',
      )
      setAction(null)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const labels: Record<ReviewAction, { title: string; description: string; confirm: string }> = {
    verify: {
      title: 'Verify this prescription?',
      description: 'Confirm that the Doctor-issued prescription is complete and suitable for pharmacy preparation.',
      confirm: 'Verify prescription',
    },
    reject: {
      title: 'Reject this prescription?',
      description: 'The required reason will be retained in pharmacy review history. Clinical prescription fields will not be changed.',
      confirm: 'Reject prescription',
    },
    mark_for_dispensing: {
      title: 'Mark ready for dispensing?',
      description: `Current usable stock for the matched medicine is ${prescription.available_quantity} units. Final stock validation occurs during dispensing.`,
      confirm: 'Mark ready',
    },
  }

  return <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-semibold">Pharmacy review</h2>
    <p className="mt-2 text-sm text-slate-600">Actions update pharmacy metadata only; the original prescription remains unchanged.</p>
    {prescription.pharmacy_status === 'pending' && <div className="mt-5 space-y-3">
      <button type="button" onClick={() => requestAction('verify')} className="hms-button hms-button-primary w-full">Verify prescription</button>
      <label className="block text-sm font-semibold text-slate-700">Rejection reason
        <textarea ref={reasonRef} maxLength={1000} placeholder="Required when rejecting" onChange={() => setReasonError('')} className="hms-input mt-1 min-h-24" />
      </label>
      {reasonError && <p role="alert" className="text-sm text-rose-700">{reasonError}</p>}
      <button type="button" onClick={() => requestAction('reject')} className="hms-button w-full border border-rose-300 text-rose-700 hover:bg-rose-50">Reject with reason</button>
    </div>}
    {prescription.pharmacy_status === 'verified' && <button type="button" onClick={() => requestAction('mark_for_dispensing')} className="hms-button hms-button-primary mt-5 w-full">Mark ready for dispensing</button>}
    {prescription.pharmacy_status === 'ready_for_dispensing' && <Link href={`/pharmacist/dispensing?prescription=${prescription.id}`} className="hms-button hms-button-primary mt-5 w-full">Open dispensing</Link>}
    {prescription.pharmacy_status === 'rejected' && <div className="mt-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-800"><p className="font-semibold">Rejected</p><p className="mt-1">{prescription.rejection_reason}</p></div>}
    {prescription.pharmacy_status === 'dispensed' && <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">This prescription has been fully dispensed. Duplicate dispensing is blocked.</p>}
    {action && <ConfirmationDialog
      open
      title={labels[action].title}
      description={labels[action].description}
      confirmLabel={labels[action].confirm}
      cancelLabel="Cancel"
      danger={action === 'reject'}
      pending={pending}
      onConfirm={confirmAction}
      onClose={() => { if (!pending) setAction(null) }}
    />}
  </aside>
}
