'use client'

import { ErrorState } from '@/components/ui/HmsUI'

export default function AdminPharmacyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      title="Unable to load pharmacy management"
      description="Master data could not be loaded. No pharmacy records were changed."
      action={<button type="button" onClick={reset} className="hms-button hms-button-primary">Try again</button>}
    />
  )
}
