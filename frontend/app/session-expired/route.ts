import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIES = [
  'token',
  'employee_permissions',
  'user_permissions',
  'user_role',
]

export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/login', request.url))
  for (const cookieName of SESSION_COOKIES) {
    response.cookies.delete(cookieName)
  }
  return response
}
