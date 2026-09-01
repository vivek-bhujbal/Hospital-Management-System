'use client'

import { ErrorState, RetryButton } from '@/components/ui/HmsUI'

export default function ManagerError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Unable to load operational data" description="The latest hospital overview is temporarily unavailable. Please try again." action={<RetryButton onClick={reset} />} />
}
