'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const router = useRouter()
  
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    if (!token) {
      setError('Invalid or missing password reset token.')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      setLoading(false)
      return
    }
    
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})")
    if (!strongRegex.test(password)) {
      setError('Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setError(data.detail || 'Failed to reset password.')
      }
    } catch (e) {
      setError('Failed to connect to the server.')
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="bg-white/80 backdrop-blur-xl py-12 px-8 shadow-2xl shadow-blue-900/5 sm:rounded-2xl border border-white text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Password Reset Successfully</h2>
        <p className="text-slate-600 mb-8">You can now login with your new password.</p>
        <Link href="/login" className="hms-button hms-button-primary w-full">
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white/80 backdrop-blur-xl py-8 px-6 shadow-2xl shadow-blue-900/5 sm:rounded-2xl sm:px-10 border border-white">
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">New Password</label>
          <div className="mt-2">
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="••••••••" />
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">Confirm New Password</label>
          <div className="mt-2">
            <input id="confirmPassword" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="••••••••" />
          </div>
        </div>

        <div className="pt-2">
          <button type="submit" disabled={loading || !token} className={`hms-button hms-button-primary w-full ${loading || !token ? 'opacity-70 cursor-not-allowed' : ''}`}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <main id="main-content" className="hms-auth min-h-screen bg-[var(--hms-bg)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center mb-6">
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Reset Password
        </h2>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Suspense fallback={<div className="text-center p-4">Loading...</div>}>
          <ResetPasswordContent />
        </Suspense>
      </div>
    </main>
  )
}
