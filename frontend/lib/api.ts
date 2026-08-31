import { cookies } from 'next/headers'

const API_BASE_URL = process.env.API_INTERNAL_URL
  || process.env.NEXT_PUBLIC_API_URL
  || 'http://localhost:8000';

export class APIError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = cookies().get('token')?.value;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store' // Do not cache authenticated requests
  });

  if (!res.ok) {
    if (res.status === 401 || (endpoint === '/auth/me' && res.status === 403)) {
      const { redirect } = await import('next/navigation');
      redirect('/session-expired');
    }
    const errorBody = await res.text();
    throw new APIError(res.status, `API Request Failed: ${res.status} ${errorBody}`);
  }
  return res.json();
}
