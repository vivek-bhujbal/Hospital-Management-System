import { fetchAPI } from '@/lib/api'
import type { RadiologyReport } from '@/lib/radiologistTypes'
import RadiologyReportsWorkspace from './RadiologyReportsWorkspace'
export default async function RadiologyReportsPage() { const reports = await fetchAPI('/radiology/reports') as RadiologyReport[]; return <RadiologyReportsWorkspace reports={reports}/> }
