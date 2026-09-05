'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bell, ChevronDown, Command, LogOut, Menu, Moon, Search, Settings,
  Sun, UserRound, X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { logoutAction } from '@/app/actions/auth'
import {
  getNotificationsAction,
  getNotificationSocketAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type LiveNotification,
} from '@/app/actions/notifications'
import Sidebar, { ROLE_LABELS, visibleMenuItems } from '@/components/Sidebar'
import { cn } from '@/components/ui/HmsUI'
import type { Permission, UserRole } from '@/lib/permissions'

export type ShellNotification = LiveNotification

interface AppShellProps {
  children: React.ReactNode
  role: UserRole
  portalRole: UserRole
  permissions: readonly Permission[]
  user: { name: string; email: string }
  notifications?: ShellNotification[]
}

const profilePaths: Partial<Record<UserRole, string>> = {
  patient: '/patient/profile',
  doctor: '/doctor/profile',
  super_admin: '/super-admin/settings',
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'HM'
}

function pageName(pathname: string) {
  const segment = pathname.split('/').filter(Boolean).at(-1) || 'home'
  if (/^\d+$/.test(segment)) return 'Record details'
  if (segment === 'home') return 'Dashboard'
  return segment.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function relativeTime(value: string | null) {
  if (!value) return 'Recently'
  const milliseconds = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.round(milliseconds / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export default function AppShell({ children, role, portalRole, permissions, user, notifications = [] }: AppShellProps) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [dark, setDark] = useState(false)
  const [liveNotifications, setLiveNotifications] = useState(notifications)
  const [notificationsLive, setNotificationsLive] = useState(false)
  const searchInput = useRef<HTMLInputElement>(null)
  const items = useMemo(() => visibleMenuItems(portalRole, permissions), [permissions, portalRole])
  const filteredItems = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
  const unread = liveNotifications.filter((notification) => notification.status !== 'read').length

  useEffect(() => {
    setLiveNotifications(notifications)
  }, [notifications])

  useEffect(() => {
    let active = true
    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined

    const refresh = async () => {
      try {
        const latest = await getNotificationsAction()
        if (active) setLiveNotifications(latest)
      } catch {
        // The ten-second fallback will retry temporary connection failures.
      }
    }

    const connect = async () => {
      try {
        const connection = await getNotificationSocketAction()
        if (!active) return
        socket = new WebSocket(connection.url, ['bearer', connection.ticket])
        socket.onopen = () => active && setNotificationsLive(true)
        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(String(event.data)) as { event?: string }
            if (payload.event === 'notifications.ready' || payload.event === 'notifications.changed') {
              void refresh()
            }
          } catch {
            // Ignore plain-text keepalive frames.
          }
        }
        socket.onclose = () => {
          if (!active) return
          setNotificationsLive(false)
          reconnectTimer = window.setTimeout(() => void connect(), 3000)
        }
        socket.onerror = () => socket?.close()
      } catch {
        if (active) reconnectTimer = window.setTimeout(() => void connect(), 5000)
      }
    }

    void connect()
    const pollingTimer = window.setInterval(() => void refresh(), 10000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      active = false
      setNotificationsLive(false)
      socket?.close()
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      window.clearInterval(pollingTimer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const markRead = async (notificationId: number) => {
    setLiveNotifications((current) => current.map((item) => (
      item.id === notificationId ? { ...item, status: 'read' } : item
    )))
    try {
      await markNotificationReadAction(notificationId)
    } catch {
      const latest = await getNotificationsAction().catch(() => null)
      if (latest) setLiveNotifications(latest)
    }
  }

  const markAllRead = async () => {
    const previous = liveNotifications
    setLiveNotifications((current) => current.map((item) => ({ ...item, status: 'read' })))
    try {
      await markAllNotificationsReadAction()
    } catch {
      setLiveNotifications(previous)
    }
  }

  useEffect(() => {
    const savedCollapsed = window.localStorage.getItem('hms-sidebar-collapsed') === 'true'
    const savedTheme = window.localStorage.getItem('hms-theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setCollapsed(savedCollapsed)
    setDark(savedTheme ? savedTheme === 'dark' : prefersDark)
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    window.localStorage.setItem('hms-theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => {
    setMobileOpen(false)
    setSearchOpen(false)
    setQuery('')
  }, [pathname])

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setMobileOpen(false)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [])

  useEffect(() => {
    if (searchOpen) window.setTimeout(() => searchInput.current?.focus(), 30)
  }, [searchOpen])

  const toggleCollapse = () => {
    setCollapsed((value) => {
      window.localStorage.setItem('hms-sidebar-collapsed', String(!value))
      return !value
    })
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--hms-bg)]">
      {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[2px] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}
      <Sidebar role={role} portalRole={portalRole} permissions={permissions} collapsed={collapsed} mobileOpen={mobileOpen} onCollapse={toggleCollapse} onClose={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hms-header relative z-30 flex h-[4.5rem] shrink-0 items-center border-b border-[var(--hms-border)] bg-[color:var(--hms-surface)]/95 px-4 backdrop-blur md:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} className="mr-3 rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <div className="min-w-0">
            <p className="truncate text-[0.68rem] font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">{ROLE_LABELS[portalRole]}</p>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">{pageName(pathname)}</p>
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => setSearchOpen(true)} className="hidden min-h-10 w-56 items-center gap-2 rounded-xl border border-[var(--hms-border)] bg-[var(--hms-surface-muted)] px-3 text-sm text-slate-500 hover:border-brand-300 hover:bg-[var(--hms-surface)] md:flex dark:text-slate-400" aria-label="Search navigation">
              <Search className="h-4 w-4" /><span>Search workspace</span><span className="ml-auto flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[0.62rem]"><Command className="h-2.5 w-2.5" />K</span>
            </button>
            <button type="button" onClick={() => setSearchOpen(true)} className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Search workspace"><Search className="h-5 w-5" /></button>
            <button type="button" onClick={() => setDark((value) => !value)} className="rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={dark ? 'Use light theme' : 'Use dark theme'}>{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</button>

            <details className="group relative">
              <summary className="relative flex cursor-pointer list-none rounded-xl p-2.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Bell className="h-5 w-5" />{unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.58rem] font-bold text-white ring-2 ring-white dark:ring-slate-900">{Math.min(unread, 9)}{unread > 9 ? '+' : ''}</span>}</summary>
              <div className="absolute right-0 top-12 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border bg-[var(--hms-surface)] shadow-raised">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div><p className="font-semibold text-slate-900 dark:text-slate-50">Notifications</p><p className={cn('mt-0.5 text-[0.65rem] font-medium', notificationsLive ? 'text-emerald-600' : 'text-slate-400')}>{notificationsLive ? 'Live updates connected' : 'Connecting live updates…'}</p></div>
                  {unread > 0 ? <button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-brand-700 hover:text-brand-900 dark:text-brand-300">Mark all read</button> : <span className="text-xs text-slate-500">0 unread</span>}
                </div>
                <div className="max-h-80 overflow-y-auto">{liveNotifications.length === 0 ? <div className="px-5 py-10 text-center"><Bell className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">You’re all caught up</p><p className="mt-1 text-xs text-slate-500">New care and workflow updates will appear here.</p></div> : liveNotifications.slice(0, 10).map((notification) => <button type="button" onClick={() => void markRead(notification.id)} key={notification.id} className={cn('block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/70', notification.status !== 'read' && 'bg-brand-50/60 dark:bg-brand-950/30')}><span className="flex gap-3"><span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', notification.status !== 'read' ? 'bg-brand-500' : 'bg-slate-300')} /><span className="min-w-0"><span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">{notification.subject || 'Workflow update'}</span><span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">{notification.body}</span><span className="mt-1 block text-[0.68rem] font-medium text-slate-400">{relativeTime(notification.created_at)}</span></span></span></button>)}</div>
              </div>
            </details>

            <details className="group relative ml-1">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl p-1.5 pr-2 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Open profile menu">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-200">{initials(user.name)}</span>
                <span className="hidden max-w-32 text-left xl:block"><span className="block truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{user.name}</span><span className="block truncate text-[0.65rem] text-slate-500">{ROLE_LABELS[role]}</span></span>
                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 xl:block" />
              </summary>
              <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border bg-[var(--hms-surface)] p-2 shadow-raised">
                <div className="border-b px-3 py-3"><p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p><span className="mt-2 inline-flex rounded-full bg-brand-50 px-2 py-1 text-[0.65rem] font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300">{ROLE_LABELS[role]}</span></div>
                {profilePaths[role] && <Link href={profilePaths[role]!} className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{role === 'super_admin' ? <Settings className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}{role === 'super_admin' ? 'Settings' : 'My profile'}</Link>}
                <button type="button" onClick={() => logoutAction()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950"><LogOut className="h-4 w-4" />Sign out securely</button>
              </div>
            </details>
          </div>
        </header>

        <main id="main-content" className="hms-content flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6 xl:px-8 xl:py-7">
          <div className="mx-auto w-full max-w-[96rem]">{children}</div>
        </main>
      </div>

      {searchOpen && <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/45 px-4 pt-[12vh] backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Search workspace">
        <button type="button" className="absolute inset-0" onClick={() => setSearchOpen(false)} aria-label="Close search" />
        <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border bg-[var(--hms-surface)] shadow-raised animate-fade-in">
          <div className="flex items-center gap-3 border-b px-4"><Search className="h-5 w-5 text-slate-400" /><input ref={searchInput} value={query} onChange={(event) => setQuery(event.target.value)} className="h-14 min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100" placeholder="Find a page in your workspace…" /><button type="button" onClick={() => setSearchOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close search"><X className="h-4 w-4" /></button></div>
          <div className="max-h-[24rem] overflow-y-auto p-2">{filteredItems.length === 0 ? <p className="px-4 py-10 text-center text-sm text-slate-500">No pages match “{query}”.</p> : filteredItems.map((item) => { const Icon = item.icon; return <Link key={item.path} href={item.path} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800 dark:text-slate-300 dark:hover:bg-brand-950 dark:hover:text-brand-200"><span className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800"><Icon className="h-4 w-4" /></span><span>{item.name}</span><span className="ml-auto text-xs text-slate-400">{item.group}</span></Link> })}</div>
          <div className="border-t bg-[var(--hms-surface-muted)] px-4 py-2.5 text-[0.68rem] text-slate-500">Press <kbd className="rounded border bg-[var(--hms-surface)] px-1.5 py-0.5">Esc</kbd> to close</div>
        </div>
      </div>}
    </div>
  )
}
