import { fetchAPI } from '@/lib/api'
import type { NurseHistorySummary } from '@/lib/nurseTypes'

import HistoryDirectory from './HistoryDirectory'

export default async function NursePatientHistory() {
  const records = await fetchAPI('/nurse/history') as NurseHistorySummary[]
  return <HistoryDirectory records={records} />
}
