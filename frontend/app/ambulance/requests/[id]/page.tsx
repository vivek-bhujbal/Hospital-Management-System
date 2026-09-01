import { fetchAPI } from '@/lib/api'
import type { AmbulanceRequestDetail, AmbulanceVehicle } from '@/lib/ambulanceTypes'
import AmbulanceRequestDetailView from './AmbulanceRequestDetailView'

export default async function AmbulanceRequestDetailPage({ params }: { params: { id: string } }) {
  const [request, vehicles] = await Promise.all([
    fetchAPI(`/ambulance/requests/${params.id}`) as Promise<AmbulanceRequestDetail>,
    fetchAPI('/ambulance/vehicles') as Promise<AmbulanceVehicle[]>,
  ])
  return <AmbulanceRequestDetailView request={request} vehicles={vehicles}/>
}
