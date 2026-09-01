'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setMessage(data.message || 'If an account with that email exists, we have sent a password reset link.')
      } else {
        setError(data.detail || 'Failed to process request.')
      }
    } catch (e) {
      setError('Failed to connect to the server.')
    }
    setLoading(false)
  }

  return (
    <main id="main-content" className="hms-auth min-h-screen bg-[var(--hms-bg)] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <Link href="/" className="flex justify-center mb-6 text-blue-600 hover:text-blue-800 transition-colors">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Forgot Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Enter your email to receive a password reset link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="hms-card py-8 px-6 sm:px-10">
          
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md">
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          )}
          
          {message && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-md">
              <p className="text-sm text-green-700 font-medium">{message}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email address</label>
              <div className="mt-2">
                <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="appearance-none block w-full px-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="you@example.com" />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" disabled={loading} className={`hms-button hms-button-primary w-full ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
