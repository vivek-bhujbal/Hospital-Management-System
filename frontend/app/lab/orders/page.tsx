import { fetchAPI } from '@/lib/api'
import type { LabOrder } from '@/lib/labTypes'
import LabOrderDirectory from './LabOrderDirectory'

export default async function LabOrdersPage() {
  const orders = await fetchAPI('/lab/orders') as LabOrder[]
  return <LabOrderDirectory orders={orders}/>
}
