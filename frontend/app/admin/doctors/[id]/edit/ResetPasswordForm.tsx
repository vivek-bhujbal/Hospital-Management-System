'use client'

import { useState } from 'react'
import { resetDoctorPasswordAction } from '@/app/actions/admin'

function generatePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export default function ResetPasswordForm({ doctorId }: { doctorId: number }) {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      setError('Please generate or enter a new password')
      return
    }
    setError('')
    setMessage('')
    setIsPending(true)
    
    const res = await resetDoctorPasswordAction(doctorId, password)
    if (res?.error) {
      setError(res.error)
    } else {
      setMessage(`Password reset successfully to: ${password}`)
      setPassword('')
    }
    setIsPending(false)
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-3xl mt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Reset Login Password</h2>
      <p className="text-gray-500 text-sm mb-6">
        Generate a new password for this doctor. They will use this to log in.
      </p>

      {error && <div className="text-red-600 bg-red-50 p-3 rounded mb-4">{error}</div>}
      {message && <div className="text-green-700 bg-green-50 border border-green-200 p-4 rounded mb-4 font-mono break-all">{message}</div>}

      <form onSubmit={handleReset} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex gap-2 flex-1 w-full">
          <input 
            type="text" 
            placeholder="New Password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="border p-2 rounded flex-1"
          />
          <button 
            type="button" 
            onClick={() => setPassword(generatePassword())} 
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-300"
          >
            Generate
          </button>
        </div>
        
        <button 
          type="submit" 
          disabled={isPending}
          className="bg-red-600 text-white px-6 py-2 rounded font-medium hover:bg-red-700 disabled:opacity-50 w-full md:w-auto"
        >
          {isPending ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  )
}
