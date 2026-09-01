'use client'

import { useFormStatus } from 'react-dom'
import { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

interface Props {
  children: ReactNode
  className?: string
  disabled?: boolean
}

export default function SubmitButton({ children, disabled = false, className = "hms-button hms-button-primary" }: Props) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${className} ${pending || disabled ? 'opacity-70 cursor-not-allowed' : ''} flex items-center justify-center`}
    >
      {pending && (
        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
      )}
      {children}
    </button>
  )
}
