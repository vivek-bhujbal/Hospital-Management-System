'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerAction } from '@/app/actions/auth'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    
    // Client-side validation
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }
    
    // Simple strength validation (length, uppercase, lowercase, number, special char)
    const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})")
    if (!strongRegex.test(password)) {
      setError('Password must contain at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.')
      setLoading(false)
      return
    }

    const result = await registerAction(null, formData)
    
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.success) {
      setSuccess(true)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Registration Successful!</h2>
            <p className="text-slate-600 mb-8">
              Please check your email and click the verification link to activate your account before logging in.
            </p>
            <Link href="/login" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all">
              Go to Login
            </Link>
          </div>
        </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-xl relative z-10">
        <Link href="/" className="flex justify-center mb-6 text-purple-600 hover:text-purple-800 transition-colors">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </Link>
        <h2 className="text-center text-3xl font-extrabold text-slate-900 tracking-tight">
          Create a Patient Account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Join the hospital management platform today
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 perspective-1000">
        <div className="bg-white/90 backdrop-blur-xl py-8 px-6 sm:px-10 border border-white rounded-3xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)] transform-gpu transition-all duration-300 hover:shadow-[0_20px_60px_rgba(100,_40,_200,_0.2)] hover:-translate-y-1">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r-md shadow-inner">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-400 mr-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1 group-focus-within:text-purple-600 transition-colors">Full Name</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                  <input id="name" name="name" type="text" required className="appearance-none block w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-800 placeholder-slate-400" placeholder="John Doe" />
                </div>
              </div>

              <div className="group">
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1 group-focus-within:text-purple-600 transition-colors">Email address</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                  <input id="email" name="email" type="email" required className="appearance-none block w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-800 placeholder-slate-400" placeholder="you@example.com" />
                </div>
              </div>

              <div className="group">
                <label htmlFor="contact" className="block text-sm font-semibold text-slate-700 mb-1 group-focus-within:text-purple-600 transition-colors">Phone Number</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                  <input id="contact" name="contact" type="tel" required className="appearance-none block w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-800 placeholder-slate-400" placeholder="+1 (555) 000-0000" />
                </div>
              </div>

              <div className="group">
                <label htmlFor="dob" className="block text-sm font-semibold text-slate-700 mb-1 group-focus-within:text-purple-600 transition-colors">Date of Birth</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                  <input id="dob" name="dob" type="date" required className="appearance-none block w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-700" />
                </div>
              </div>

              <div className="group">
                <label htmlFor="gender" className="block text-sm font-semibold text-slate-700 mb-1 group-focus-within:text-purple-600 transition-colors">Gender</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                  <select id="gender" name="gender" required className="appearance-none block w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-700 cursor-pointer">
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="group">
                <label htmlFor="blood_group" className="block text-sm font-semibold text-slate-700 mb-1 group-focus-within:text-purple-600 transition-colors">Blood Group</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                  <select id="blood_group" name="blood_group" className="appearance-none block w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-700 cursor-pointer">
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
              </div>

              <div className="group">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1 group-focus-within:text-purple-600 transition-colors">Password</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all flex">
                  <input id="password" name="password" type={showPassword ? "text" : "password"} required className="appearance-none block w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-800 placeholder-slate-400" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="pr-3 flex items-center text-slate-400 hover:text-purple-600 transition-colors">
                    {showPassword ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 011.564-3.03A10 10 0 0121.542 12a9.97 9.97 0 01-1.563 3.03" /></svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="group">
                <label htmlFor="confirm_password" className="block text-sm font-semibold text-slate-700 mb-1 group-focus-within:text-purple-600 transition-colors">Confirm Password</label>
                <div className="relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded-xl bg-slate-50 border border-slate-200 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-200 transition-all">
                  <input id="confirm_password" name="confirm_password" type={showPassword ? "text" : "password"} required className="appearance-none block w-full px-4 py-3 bg-transparent rounded-xl focus:outline-none text-slate-800 placeholder-slate-400" placeholder="••••••••" />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button type="submit" disabled={loading} className={`w-full flex justify-center py-4 px-4 rounded-xl shadow-[0_8px_0_rgba(93,59,219,1)] active:shadow-[0_0px_0_rgba(93,59,219,1)] active:translate-y-2 text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 transition-all uppercase tracking-wider ${loading ? 'opacity-70 cursor-not-allowed active:translate-y-0 active:shadow-[0_8px_0_rgba(93,59,219,1)]' : ''}`}>
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm border-t border-slate-200 pt-6">
            <span className="text-slate-500 font-medium">Already have an account? </span>
            <Link href="/login" className="font-bold text-purple-600 hover:text-purple-500 transition-colors">
              Sign in instead
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}