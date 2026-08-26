import { fetchAPI } from '@/lib/api'

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

export default async function EnterpriseResourcePage({
  title,
  endpoint,
  description,
}: EnterpriseResourcePageProps) {
  let payload: unknown
  try {
    payload = await fetchAPI(endpoint)
  } catch (error) {
    if (isRedirect(error)) throw error
    return (
      <section>
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        {description && <p className="mt-2 text-gray-600">{description}</p>}
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
          This data could not be loaded. Check that the API and database migrations are running.
        </div>
      </section>
    )
  }

  const records: JsonRecord[] = Array.isArray(payload)
    ? payload.filter((item): item is JsonRecord => typeof item === 'object' && item !== null)
    : []

  if (!Array.isArray(payload)) {
    const summary: Array<[string, unknown]> = typeof payload === 'object' && payload !== null
      ? Object.entries(payload as JsonRecord)
      : [['value', payload]]
    return (
      <section>
        <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
        {description && <p className="mt-2 text-gray-600">{description}</p>}
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map(([key, value]) => (
            <div key={key} className="rounded-lg border bg-white p-5 shadow-sm">
              <dt className="text-sm font-medium capitalize text-gray-500">{key.replaceAll('_', ' ')}</dt>
              <dd className="mt-2 break-words text-xl font-semibold text-gray-900">{displayValue(value)}</dd>
            </div>
          ))}
        </dl>
      </section>
    )
  }

  const columns = Array.from(new Set(records.flatMap((record) => Object.keys(record)))).slice(0, 8)
  return (
    <section>
      <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      {description && <p className="mt-2 text-gray-600">{description}</p>}
      <div className="mt-6 overflow-x-auto rounded-lg border bg-white shadow-sm">
        {records.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No records found.</p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>{columns.map((column) => <th key={column} className="px-4 py-3 text-left font-semibold capitalize text-gray-600">{column.replaceAll('_', ' ')}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.map((record, index) => (
                <tr key={String(record.id ?? index)}>
                  {columns.map((column) => <td key={column} className="max-w-xs break-words px-4 py-3 text-gray-700">{displayValue(record[column])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
