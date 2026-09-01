'use client'

import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

import { cn } from './HmsUI'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, title, description, children, footer, onClose, size = 'md' }: ModalProps) {
  const titleId = useId()
  const descriptionId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => closeRef.current?.focus(), 30)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [onClose, open])

  if (!open) return null
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }
  return <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined}>
    <button type="button" className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} aria-label="Close dialog" />
    <section className={cn('relative flex max-h-[min(48rem,calc(100dvh-2rem))] w-full flex-col overflow-hidden rounded-2xl border bg-[var(--hms-surface)] shadow-raised animate-fade-in', widths[size])}>
      <header className="flex items-start gap-4 border-b px-5 py-4 sm:px-6"><div className="min-w-0 flex-1"><h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-50">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p>}</div><button ref={closeRef} type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200" aria-label="Close"><X className="h-5 w-5" /></button></header>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      {footer && <footer className="flex flex-col-reverse gap-2 border-t bg-[var(--hms-surface-muted)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{footer}</footer>}
    </section>
  </div>
}

interface ConfirmationDialogProps {
  open: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel?: string
  danger?: boolean
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmationDialog({ open, title, description, confirmLabel, cancelLabel = 'Keep current', danger = false, pending = false, onConfirm, onClose }: ConfirmationDialogProps) {
  return <Modal open={open} title={title} description={description} onClose={onClose} size="sm" footer={<><button type="button" onClick={onClose} disabled={pending} className="hms-button hms-button-secondary">{cancelLabel}</button><button type="button" onClick={onConfirm} disabled={pending} className={cn('hms-button', danger ? 'bg-rose-600 text-white hover:bg-rose-700' : 'hms-button-primary')}>{pending ? 'Working…' : confirmLabel}</button></>}>
    <div className="flex gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"><AlertTriangle className="h-5 w-5 shrink-0" /><p>This action may affect an active hospital workflow. Please verify the record before continuing.</p></div>
  </Modal>
}
