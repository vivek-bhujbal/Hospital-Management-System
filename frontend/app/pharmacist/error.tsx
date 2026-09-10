'use client'

import { ErrorState } from '@/components/ui/HmsUI'

export default function PharmacistError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState
    title="Unable to load pharmacy operations"
    description="The latest pharmacy data could not be loaded. No prescription or stock record was changed."
    action={<button type="button" onClick={reset} className="hms-button hms-button-primary">Try again</button>}
  />
}
