import { fetchAPI } from '@/lib/api'
import type { AmbulanceRequestRecord, AmbulanceVehicle } from '@/lib/ambulanceTypes'
import AmbulanceRequestWorkspace from './AmbulanceRequestWorkspace'

export default async function AmbulanceRequestsPage() {
  const [requests, vehicles] = await Promise.all([
    fetchAPI('/ambulance/requests') as Promise<AmbulanceRequestRecord[]>,
    fetchAPI('/ambulance/vehicles') as Promise<AmbulanceVehicle[]>,
  ])
  return <AmbulanceRequestWorkspace requests={requests} vehicles={vehicles}/>
}
