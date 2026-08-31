'use client'

export default function ManagerError({ reset }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8">
      <h1 className="text-xl font-semibold text-red-900">Hospital operations data could not be loaded.</h1>
      <p className="mt-2 text-sm text-red-800">Please retry. If the issue continues, contact the system administrator.</p>
      <button onClick={reset} className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Try again</button>
    </div>
  )
}
