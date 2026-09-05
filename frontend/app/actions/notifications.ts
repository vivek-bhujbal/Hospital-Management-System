'use server'

import { fetchAPI } from '@/lib/api'

export interface LiveNotification {
  id: number
  type: string
  subject: string | null
  body: string
  status: string
  entity_type: string | null
  entity_id: number | null
  created_at: string | null
}

export async function getNotificationsAction(): Promise<LiveNotification[]> {
  return await fetchAPI('/notifications/me') as LiveNotification[]
}

export async function markNotificationReadAction(notificationId: number): Promise<void> {
  await fetchAPI(`/notifications/${notificationId}/read`, { method: 'PUT' })
}

export async function markAllNotificationsReadAction(): Promise<void> {
  await fetchAPI('/notifications/read-all', { method: 'PUT' })
}

export async function getNotificationSocketAction(): Promise<{ ticket: string; url: string }> {
  const result = await fetchAPI('/notifications/socket-ticket', { method: 'POST' }) as { ticket: string }
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  const socketUrl = new URL('/ws/notifications', publicApiUrl)
  socketUrl.protocol = socketUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  return { ticket: result.ticket, url: socketUrl.toString() }
}
