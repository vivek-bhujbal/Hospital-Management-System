'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing verification token.')
      return
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/verify-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        const data = await res.json()

        if (res.ok) {
          setStatus('success')
          setMessage('Email verified successfully!')
        } else {
          setStatus('error')
          setMessage(data.detail || 'Verification link is invalid or expired.')
        }
      } catch (e) {
        setStatus('error')
        setMessage('Failed to connect to the server. Please try again.')
      }
    }

    verifyToken()
  }, [token])

  return (
    <div className="bg-white/80 backdrop-blur-xl py-12 px-8 shadow-2xl shadow-blue-900/5 sm:rounded-2xl border border-white text-center">
      {status === 'loading' && (
        <>
          <div className="mx-auto flex items-center justify-center h-16 w-16 mb-6">
            <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{message}</h2>
          <p className="text-slate-600">Please wait while we verify your account.</p>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">{message}</h2>
          <p className="text-slate-600 mb-8">Your account is now active. You can login.</p>
          <Link href="/login" className="hms-button hms-button-primary w-full">
            Go to Login
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h2>
          <p className="text-slate-600 mb-8">{message}</p>
          
          <div className="flex flex-col gap-3">
            <Link href="/login" className="w-full flex justify-center py-3 px-4 border border-slate-300 rounded-xl shadow-sm text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">
              Go to Login
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <main id="main-content" className="hms-auth min-h-screen bg-[var(--hms-bg)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-6">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Email Verification
        </h2>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
          <VerifyEmailContent />
        </Suspense>
      </div>
    </main>
  )
}
