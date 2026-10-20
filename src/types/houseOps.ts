import type { LateEntryStatus, VisitorStatus } from './enums'

/** Curfew (D2) and visitors (D4). */

interface StayRef {
  tenancy_id: number
  tenant: { id: number; name: string | null }
  room: { id: number; label: string } | null
}

export interface LateEntry extends StayRef {
  id: number
  on_date: string
  expected_arrival: string
  reason: string
  status: LateEntryStatus
  status_label: string
  decided_by: string | null
  decided_at: string | null
  decline_reason: string | null
  created_at: string | null
  can: { decide: boolean; cancel: boolean }
}

export interface CurfewViolation extends StayRef {
  id: number
  on_date: string
  arrived_at: string | null
  note: string | null
  /** Staff only */
  logged_by: string | null
  created_at: string | null
}

export interface Visitor extends StayRef {
  id: number
  name: string
  contact: string | null
  visit_on: string
  expected_in: string | null
  expected_out: string | null
  overnight: boolean
  nights: number
  status: VisitorStatus
  status_label: string
  is_walk_in: boolean
  over_limit: boolean
  decided_by: string | null
  decline_reason: string | null
  checked_in_at: string | null
  checked_out_at: string | null
  can: { decide: boolean; check_in: boolean; check_out: boolean; cancel: boolean }
}

export interface NightsUsed {
  used: number
  limit: number
  needs_approval: boolean
}

export interface VisitorInput {
  name: string
  contact?: string | null
  visit_on: string
  expected_in?: string | null
  expected_out?: string | null
  overnight: boolean
  nights?: number | null
}

/** For the home screen: what waits at one property. */
export interface HouseOpsSummary {
  property_id: number
  property_name: string
  late_entries: number
  overnight: number
  /** Stays with 3 or more late arrivals in 30 days */
  repeated: number
}

export interface LateEntryInput {
  on_date: string
  expected_arrival: string
  reason: string
}
