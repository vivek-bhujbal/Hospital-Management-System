import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { protectedPortalRedirect, roleHome } from '@/lib/roleRoutes'

// Paths that do not require authentication
const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let the route handler clear stale/disabled sessions before middleware
  // redirects authenticated users away from public pages.
  if (pathname === '/session-expired') {
    return NextResponse.next()
  }
  
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
    const homeRoute = roleHome(userRole)
    return NextResponse.redirect(new URL(homeRoute, request.url))
  }

  // Fast UX guard based on the HttpOnly role cookie. The live backend role
  // check in each layout and FastAPI dependencies remain authoritative.
  if (token) {
    const routeRedirect = protectedPortalRedirect(pathname, userRole)
    if (routeRedirect) {
      return NextResponse.redirect(new URL(routeRedirect, request.url))
    }
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
