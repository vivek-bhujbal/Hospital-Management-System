import { fetchAPI } from '@/lib/api'
import type { LabResult } from '@/lib/labTypes'
import LabResultsWorkspace from './LabResultsWorkspace'

export default async function LabResultsPage() {
  const results = await fetchAPI('/lab/results') as LabResult[]
  return <LabResultsWorkspace results={results}/>
}
