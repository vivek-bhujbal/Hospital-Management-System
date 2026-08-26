import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Define the exact home route for each role
const roleHomeMap: Record<string, string> = {
  'super_admin': '/super-admin/home',
  'admin': '/admin/home',
  'hospital_manager': '/manager/home',
  'doctor': '/doctor/home',
  'nurse': '/nurse/home',
  'receptionist': '/receptionist/home',
  'pharmacist': '/pharmacy/home',
  'lab_technician': '/lab/home',
  'radiologist': '/radiology/home',
  'accountant': '/accountant/home',
  'insurance_officer': '/insurance/home',
  'ambulance_staff': '/ambulance/home',
  'patient': '/patient/home',
}

// Paths that do not require authentication
const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files, api routes, Next.js internal routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') || 
    pathname === '/' // allow landing page
  ) {
    return NextResponse.next()
  }

  const token = request.cookies.get('token')?.value
  const userRole = request.cookies.get('user_role')?.value

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // 1. If trying to access protected route without token, redirect to login
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. If trying to access public path (like login) while already logged in
  if (token && userRole && isPublicPath) {
    const homeRoute = roleHomeMap[userRole] || '/login'
    return NextResponse.redirect(new URL(homeRoute, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
