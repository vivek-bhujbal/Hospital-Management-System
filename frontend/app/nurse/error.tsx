'use client'

import { ErrorState, RetryButton } from '@/components/ui/HmsUI'

export default function NurseError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Unable to load nursing workspace" description="Assigned patient and task data could not be loaded. No nursing record was changed." action={<RetryButton onClick={reset} />} />
}
