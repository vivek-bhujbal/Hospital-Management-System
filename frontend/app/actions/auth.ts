'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_URL = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type AuthActionState = { error?: string; success?: boolean; redirectUrl?: string }

interface LoginResponse {
  access_token: string
  role: string
  permissions?: Record<string, boolean>
  effective_permissions: string[]
  expires_in: number
}

export async function loginAction(_prevState: AuthActionState | null, formData: FormData): Promise<AuthActionState> {
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

    const data = await res.json() as LoginResponse
    
    // Set HttpOnly cookie
    cookies().set('token', data.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.expires_in
    })
    
    if (data.permissions) {
      cookies().set('employee_permissions', JSON.stringify(data.permissions), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: data.expires_in
      })
    } else {
      cookies().delete('employee_permissions')
    }

    cookies().set('user_permissions', JSON.stringify(data.effective_permissions || []), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.expires_in
    })
    cookies().set('user_role', data.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: data.expires_in
    })

    // Prepare redirect URL
    const role = data.role
    let redirectUrl = '/'

    switch (role) {
      case 'super_admin': redirectUrl = '/super-admin/home'; break;
      case 'admin': redirectUrl = '/admin/home'; break;
      case 'hospital_manager': redirectUrl = '/manager/home'; break;
      case 'doctor': redirectUrl = '/doctor/home'; break;
      case 'nurse': redirectUrl = '/nurse/home'; break;
      case 'receptionist': redirectUrl = '/receptionist/home'; break;
      case 'pharmacist': redirectUrl = '/pharmacy/home'; break;
      case 'lab_technician': redirectUrl = '/lab/home'; break;
      case 'radiologist': redirectUrl = '/radiology/home'; break;
      case 'accountant': redirectUrl = '/accountant/home'; break;
      case 'insurance_officer': redirectUrl = '/insurance/home'; break;
      case 'ambulance_staff': redirectUrl = '/ambulance/home'; break;
      case 'patient': redirectUrl = '/patient/home'; break;
      default: redirectUrl = '/login'; break; // Fallback to login if unknown
    }
    
    return { redirectUrl }
  } catch (error) {
    return { error: 'Failed to connect to the server' }
  }
}

export async function registerAction(_prevState: AuthActionState | null, formData: FormData): Promise<AuthActionState> {
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
  cookies().delete('employee_permissions')
  cookies().delete('user_permissions')
  cookies().delete('user_role')
  redirect('/login')
}
