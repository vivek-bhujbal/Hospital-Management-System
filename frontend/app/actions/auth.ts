'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email')
  const password = formData.get('password')

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!res.ok) {
      let errorMsg = 'Invalid email or password'
      try {
        const errorData = await res.json()
        if (errorData.detail) {
          errorMsg = errorData.detail
        }
      } catch (e) {
        // ignore JSON parse error
      }
      return { error: errorMsg }
    }

    const data = await res.json()
    
    // Set HttpOnly cookie
    cookies().set('token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 60 // 30 minutes
    })
    
    if (data.permissions) {
      cookies().set('employee_permissions', JSON.stringify(data.permissions), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 60
      })
    } else {
      cookies().delete('employee_permissions')
    }

    // Prepare redirect URL
    const role = data.role
    let redirectUrl = '/'
    if (role === 'patient') redirectUrl = '/patient/home'
    else if (role === 'doctor') redirectUrl = '/doctor/home'
    else if (role === 'receptionist') redirectUrl = '/receptionist/home'
    else if (role === 'admin') redirectUrl = '/admin/home'
    
    return { redirectUrl }
  } catch (error) {
    return { error: 'Failed to connect to the server' }
  }
}

export async function registerAction(prevState: any, formData: FormData) {
  const name = formData.get('name')
  const email = formData.get('email')
  const password = formData.get('password')
  const contact = formData.get('contact') || ''
  const gender = formData.get('gender') || null
  const dob = formData.get('dob')
  const blood_group = formData.get('blood_group') || null
  
  let age = null
  if (dob) {
    const birthDate = new Date(dob.toString())
    const diff_ms = Date.now() - birthDate.getTime()
    const age_dt = new Date(diff_ms) 
    age = Math.abs(age_dt.getUTCFullYear() - 1970)
  }

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, contact, gender, age, blood_group })
    })

    if (!res.ok) {
      const errorData = await res.json()
      return { error: errorData.detail || 'Registration failed' }
    }

    return { success: true }
  } catch (error) {
    return { error: 'Failed to connect to the server' }
  }
}

export async function logoutAction() {
  cookies().delete('token')
  redirect('/login')
}
