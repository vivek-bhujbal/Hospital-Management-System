import { fetchAPI } from '@/lib/api'
import type { RadiologyOrder } from '@/lib/radiologistTypes'
import ImagingOrderDirectory from './ImagingOrderDirectory'
export default async function ImagingOrdersPage() { const orders = await fetchAPI('/radiology/orders') as RadiologyOrder[]; return <ImagingOrderDirectory orders={orders}/> }
