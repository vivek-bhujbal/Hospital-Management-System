'use client'

import { ErrorState, RetryButton } from '@/components/ui/HmsUI'

export default function DoctorError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Unable to load clinical workspace" description="Your patient and appointment data could not be loaded. No clinical record was changed." action={<RetryButton onClick={reset} />} />
}
