'use client'

import { useRef } from 'react'
import { useToast } from './ToastProvider'

export default function ClientForm({ action, children, successMessage, className }: { action: any, children: React.ReactNode, successMessage?: string, className?: string }) {
  const { showToast } = useToast()
  const ref = useRef<HTMLFormElement>(null)

  async function handleSubmit(formData: FormData) {
    try {
      const res = await action(formData)
      if (res?.error) {
        showToast(res.error, 'error')
      } else {
        if (successMessage) showToast(successMessage, 'success')
        ref.current?.reset()
      }
    } catch (e: any) {
      if (e.message && e.message.includes('NEXT_REDIRECT')) {
        throw e;
      }
      showToast(e.message || 'An unexpected error occurred', 'error')
    }
  }

  return (
    <form ref={ref} action={handleSubmit} className={className}>
      {children}
    </form>
  )
}

