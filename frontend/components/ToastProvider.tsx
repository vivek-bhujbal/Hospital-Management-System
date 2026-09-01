'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  type: ToastType
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-[var(--hms-surface)] px-4 py-3.5 text-sm font-medium text-[var(--hms-text)] shadow-raised animate-slide-in ${toast.type === 'error' ? 'border-rose-200 dark:border-rose-900' : toast.type === 'success' ? 'border-emerald-200 dark:border-emerald-900' : 'border-blue-200 dark:border-blue-900'}`}
          >
            {toast.type === 'error' ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /> : toast.type === 'success' ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />}
            <span className="min-w-0 flex-1 leading-5">{toast.message}</span>
            <button type="button" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} className="rounded-md p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800" aria-label="Dismiss notification"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
