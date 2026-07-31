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
      return { error: 'Invalid email or password' }
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
  const role = formData.get('role')

  try {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
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
