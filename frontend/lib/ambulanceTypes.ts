export type AmbulanceRequestStatus = 'requested' | 'assigned' | 'en_route' | 'arrived' | 'transporting' | 'completed' | 'cancelled'
export type VehicleStatus = 'available' | 'assigned' | 'en_route' | 'arrived' | 'transporting' | 'maintenance' | 'unavailable'

export interface AmbulanceRequestRecord {
  id: number
  patient_id: number | null
  patient_name: string | null
  pickup_location: string
  destination: string | null
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: AmbulanceRequestStatus
  requested_at: string
  updated_at: string
  trip_id: number | null
  ambulance_id: number | null
  vehicle_number: string | null
  staff_id: number | null
  staff_name: string | null
}

export interface AmbulanceVehicle {
  id: number
  vehicle_number: string
  vehicle_type: string | null
  capacity: number | null
  status: VehicleStatus
  maintenance_status: 'maintenance' | 'operational'
  assigned_at?: string
}

export interface AmbulanceDashboard {
  available_ambulances: number
  active_trips: number
  pending_requests: number
  assigned_requests: number
  completed_trips: number
  emergency_alerts: AmbulanceRequestRecord[]
}

export interface AmbulanceTripRecord {
  id: number
  request_id: number
  patient_id: number | null
  patient_name: string | null
  ambulance_id: number
  vehicle_number: string
  staff_id: number
  staff_name: string
  pickup_location: string
  destination: string | null
  priority: string
  status: AmbulanceRequestStatus
  accepted_at: string
  start_time: string | null
  arrival_time: string | null
  transport_time: string | null
  end_time: string | null
}

export interface AmbulanceRequestDetail extends AmbulanceRequestRecord {
  contact: string | null
  trip: AmbulanceTripRecord | null
  history: {
    id: number
    old_status: string | null
    status: string
    staff_id: number
    staff_name: string
    recorded_at: string
  }[]
}

export function ambulanceStatusClass(status: AmbulanceRequestStatus | VehicleStatus): string {
  if (status === 'completed' || status === 'available') return 'bg-emerald-100 text-emerald-800'
  if (status === 'cancelled' || status === 'unavailable') return 'bg-red-100 text-red-800'
  if (status === 'maintenance') return 'bg-amber-100 text-amber-800'
  return 'bg-blue-100 text-blue-800'
}
