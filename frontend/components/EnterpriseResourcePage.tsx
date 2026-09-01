import { fetchAPI } from '@/lib/api'
import DataTable from '@/components/ui/DataTable'
import { ErrorState, PageHeader } from '@/components/ui/HmsUI'

interface EnterpriseResourcePageProps {
  title: string
  endpoint: string
  description?: string
}

type JsonRecord = Record<string, unknown>

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function isRedirect(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'digest' in error
    && String((error as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')
}

export default async function EnterpriseResourcePage({ title, endpoint, description }: EnterpriseResourcePageProps) {
  let payload: unknown
  try {
    payload = await fetchAPI(endpoint)
  } catch (error) {
    if (isRedirect(error)) throw error
    return <section className="space-y-6"><PageHeader eyebrow="Hospital workspace" title={title} description={description} /><ErrorState title={`Unable to load ${title.toLowerCase()}`} description="Something went wrong while loading this data. Please refresh the page or try again shortly." /></section>
  }

  const records: JsonRecord[] = Array.isArray(payload)
    ? payload.filter((item): item is JsonRecord => typeof item === 'object' && item !== null)
    : []

  if (!Array.isArray(payload)) {
    const summary: Array<[string, unknown]> = typeof payload === 'object' && payload !== null
      ? Object.entries(payload as JsonRecord)
      : [['value', payload]]
    return <section className="space-y-6"><PageHeader eyebrow="Hospital workspace" title={title} description={description} /><dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summary.map(([key, value]) => <div key={key} className="hms-card p-5"><dt className="text-sm font-medium capitalize text-slate-500">{key.replaceAll('_', ' ')}</dt><dd className="mt-2 break-words text-xl font-semibold text-slate-900">{displayValue(value)}</dd></div>)}</dl></section>
  }

  const columns = Array.from(new Set(records.flatMap((record) => Object.keys(record)))).slice(0, 8)
  return <section className="space-y-6"><PageHeader eyebrow="Hospital workspace" title={title} description={description} /><DataTable records={records} columns={columns} label={title} /></section>
}
