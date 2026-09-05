import { fetchAPI } from '@/lib/api'
import type { NurseTask } from '@/lib/nurseTypes'

import TaskBoard from './TaskBoard'

export default async function NurseTasks({ searchParams }: { searchParams: { patient_id?: string } }) {
  const tasks = await fetchAPI('/nurse/tasks') as NurseTask[]
  return <TaskBoard tasks={tasks} initialPatientId={searchParams.patient_id ?? 'all'} />
}
