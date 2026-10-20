import type { MaintenanceCategory, MaintenanceStatus, MaintenanceUrgency } from './enums'

/** A maintenance request (D1). Money is integer centavos. */
export interface MaintenanceRequest {
  id: number
  property: { id: number; name: string }
  room: { id: number; label: string } | null
  reported_by: { id: number; name: string }
  category: MaintenanceCategory
  category_label: string
  description: string
  urgency: MaintenanceUrgency
  urgency_label: string
  status: MaintenanceStatus
  status_label: string
  assignee: { id: number; name: string } | null
  resolution: string | null
  cancel_reason: string | null
  created_at: string | null
  started_at: string | null
  resolved_at: string | null
  closed_at: string | null
  cancelled_at: string | null
  photos_count?: number
  /** Staff only */
  repair_cost_centavos?: number | null
  /** Detail only */
  photos?: string[]
  history?: { author: string | null; body: string; created_at: string | null }[]
  charge?: { bill_id: number; number: string; amount_centavos: number } | null
  unit?: { id: number; label: string; not_ready: boolean; not_ready_reason: string | null } | null
  can?: {
    start: boolean
    resolve: boolean
    assign: boolean
    set_cost: boolean
    cancel: boolean
    confirm: boolean
    reopen: boolean
    charge: boolean
    set_not_ready: boolean
    add_note: boolean
  }
}

export interface MaintenanceInput {
  category: MaintenanceCategory
  description: string
  urgency: MaintenanceUrgency
  /** Staff logging one: a room, or none for the whole place */
  room_id?: number | null
  photos: File[]
}

export interface MaintenanceSummary {
  property_id: number
  property_name: string
  open_count: number
  urgent_count: number
}
