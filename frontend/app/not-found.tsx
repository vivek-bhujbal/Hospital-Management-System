import Link from 'next/link'
import { SearchX } from 'lucide-react'

export default function NotFound() {
  return <main id="main-content" className="flex min-h-screen items-center justify-center bg-[var(--hms-bg)] p-5"><section className="hms-card w-full max-w-lg px-8 py-12 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"><SearchX className="h-6 w-6" /></span><p className="hms-eyebrow mt-6">404 · Page not found</p><h1 className="hms-page-title mt-2">This page is unavailable</h1><p className="hms-page-description mx-auto">The link may be outdated, or this page may not be available for your role.</p><Link href="/login" className="hms-button hms-button-primary mt-6">Return to your portal</Link></section></main>
}
