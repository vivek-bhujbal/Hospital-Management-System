import { fetchAPI } from '@/lib/api'
import type { AmbulanceVehicle } from '@/lib/ambulanceTypes'
import AmbulanceVehicleWorkspace from './AmbulanceVehicleWorkspace'

export default async function AmbulanceVehiclesPage() {
  const vehicles = await fetchAPI('/ambulance/vehicles') as AmbulanceVehicle[]
  return <AmbulanceVehicleWorkspace vehicles={vehicles}/>
}
