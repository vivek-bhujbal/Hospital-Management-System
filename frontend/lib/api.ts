import { cookies } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    if (res.status === 401) {
      const { redirect } = await import('next/navigation');
      redirect('/login');
    }
    const errorBody = await res.text();
    throw new Error(`API Request Failed: ${res.status} ${errorBody}`);
  }
  return res.json();
}
