import { LoadingState } from '@/components/ui/HmsUI'

export default function Loading() {
  return <main id="main-content" className="mx-auto min-h-screen max-w-[96rem] bg-[var(--hms-bg)] px-4 py-8 sm:px-6"><LoadingState label="Preparing your secure workspace" /></main>
}
