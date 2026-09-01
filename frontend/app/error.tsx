'use client'

import { ErrorState, RetryButton } from '@/components/ui/HmsUI'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" className="flex min-h-screen items-center justify-center bg-[var(--hms-bg)] p-5"><div className="w-full max-w-xl"><ErrorState title="Unable to open this page" description="The workspace encountered an unexpected problem. Your data has not been changed." action={<RetryButton onClick={reset} />} /></div></main>
}
