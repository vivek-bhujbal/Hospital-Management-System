'use client'

export default function NurseError({ reset }: { reset: () => void }) {
  return <div className="rounded-2xl border border-red-200 bg-red-50 p-8"><h1 className="text-xl font-semibold text-red-900">Nursing data could not be loaded</h1><p className="mt-2 text-sm text-red-700">Check the API connection and try again.</p><button onClick={reset} className="mt-5 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white">Try again</button></div>
}
