import os

base_dir = r"c:\Users\Dcodetech\Desktop\Student Result System\Hospital-Management-System\frontend\components"
os.makedirs(base_dir, exist_ok=True)

toast_provider = """'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

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
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded shadow-lg text-white font-medium min-w-[250px] transform transition-all duration-300 ${
              toast.type === 'error' ? 'bg-red-600' : toast.type === 'success' ? 'bg-green-600' : 'bg-blue-600'
            }`}
          >
            {toast.message}
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
"""

submit_button = """'use client'

import { useFormStatus } from 'react-dom'
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
}

export default function SubmitButton({ children, className = "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition" }: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} ${pending ? 'opacity-70 cursor-not-allowed' : ''} flex items-center justify-center`}
    >
      {pending && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  )
}
"""

client_form = """'use client'

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
      showToast(e.message || 'An unexpected error occurred', 'error')
    }
  }

  return (
    <form ref={ref} action={handleSubmit} className={className}>
      {children}
    </form>
  )
}
"""

with open(os.path.join(base_dir, "ToastProvider.tsx"), "w") as f: f.write(toast_provider)
with open(os.path.join(base_dir, "SubmitButton.tsx"), "w") as f: f.write(submit_button)
with open(os.path.join(base_dir, "ClientForm.tsx"), "w") as f: f.write(client_form)

print("UI components created successfully.")
