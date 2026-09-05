'use client'

import { useRef, useState, type ReactNode } from 'react'

import { useToast } from '@/components/ToastProvider'
import { ConfirmationDialog } from '@/components/ui/Modal'

interface ConfirmDeleteFormProps {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  children?: ReactNode
  title: string
  description: string
  successMessage: string
  trigger: ReactNode
  triggerLabel: string
  triggerClassName?: string
  confirmLabel?: string
  className?: string
}

export default function ConfirmDeleteForm({
  action,
  children,
  title,
  description,
  successMessage,
  trigger,
  triggerLabel,
  triggerClassName = 'hms-button border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300',
  confirmLabel = 'Delete',
  className,
}: ConfirmDeleteFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const { showToast } = useToast()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  async function confirmDelete() {
    if (!formRef.current || pending) return
    setPending(true)
    try {
      const result = await action(new FormData(formRef.current))
      if (result?.error) {
        showToast(result.error, 'error')
        return
      }
      showToast(successMessage, 'success')
      setOpen(false)
      formRef.current?.reset()
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) throw error
      showToast(error instanceof Error ? error.message : 'An unexpected error occurred', 'error')
    } finally {
      setPending(false)
    }
  }

  return <form ref={formRef} onSubmit={(event) => event.preventDefault()} className={className}>
    {children}
    <button type="button" onClick={() => setOpen(true)} disabled={pending} aria-label={triggerLabel} className={triggerClassName}>
      {trigger}
    </button>
    <ConfirmationDialog
      open={open}
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      cancelLabel="Cancel"
      danger
      pending={pending}
      onConfirm={confirmDelete}
      onClose={() => { if (!pending) setOpen(false) }}
    />
  </form>
}
