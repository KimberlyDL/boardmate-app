import type { RoomLeader } from './tenancy'
import type {
  BilledBy,
  PropertyAbility,
  PropertyType,
  RentalMode,
  UnitKind,
  UnitStatus,
  UtilityMethod,
  UtilityType,
  WhoCanStay,
} from './enums'

export interface Unit {
  id: number
  room_id: number
  kind: UnitKind
  label: string
  sort_order: number
  capacity: number
  status: UnitStatus
  status_label: string
  not_ready: boolean
  not_ready_reason: string | null
  rent_centavos: number | null
  upcoming_rent: { amount_centavos: number; effective_from: string } | null
  /** Who lives here now (staff only) */
  tenant_name: string | null
  /** A bedspace room's "also rent whole" unit */
  is_whole_option: boolean
  /** Held back because the other side of the whole-room option is taken */
  blocked: boolean
  /** Set while a boarder holds a reservation on this unit (F2). */
  reservation: { application_id: number; boarder_name: string; reserved_until: string } | null
}

/** A room of a property, rented whole or by bedspace (B1). */
export interface Room {
  id: number
  property_id: number
  /** e.g. F4-03; the floor part is left out when the room has no floor */
  code: string
  number: number
  floor: number | null
  /** The number on the door, typed by the owner; unique within the property */
  door_no: string | null
  /** What people call the room: the door number when set, else the code */
  label: string
  who_can_stay: WhoCanStay
  who_can_stay_label: string
  rental_mode: RentalMode
  rental_mode_label: string
  /** Rented as one room right now (whole, or its whole-room option is held) */
  let_whole: boolean
  /** Places only (the whole-room option is not counted) */
  counts: { units: number; available: number }
  units: Unit[]
  /** The room's current leader, if it has one */
  leader?: RoomLeader | null
  /** People staying in a room rented whole (the leader included) */
  occupants_count?: number
}

export interface UtilityAccount {
  id: number
  type: UtilityType
  type_label: string
  name: string
  method: UtilityMethod
  method_label: string
  billed_by: BilledBy
  billed_by_label: string
  notes: string | null
  has_fixed_amount: boolean
  amount_centavos: number | null
  upcoming_amount: { amount_centavos: number; effective_from: string } | null
}

export interface PriceRule {
  id: number
  amount_centavos: number
  effective_from: string
  effective_to: string | null
  state: 'past' | 'current' | 'scheduled'
  set_by: string | null
  created_at: string
}

export interface PropertyPhoto {
  id: number
  /** 1600 px WebP, for the gallery */
  url: string
  /** 480 px WebP, for grids and cards */
  thumb_url: string
  is_cover: boolean
  sort_order: number
}

export interface ChecklistItem {
  key: string
  label: string
  ok: boolean
}

export interface PropertyCaretakerAssignment {
  caretaker_id: number
  name: string
  email: string
  access_level: 'collector' | 'manager'
  access_level_label: string
}

/** 'owner' | 'manager' | 'collector' */
export type PropertyRole = 'owner' | 'manager' | 'collector'

export interface PropertySummary {
  id: number
  name: string
  type: PropertyType
  type_label: string
  /** Summary over the property's rooms: all whole, all by bedspace, or a mix. */
  rental_mode: RentalMode | 'mixed'
  rental_mode_label: string
  city: string | null
  is_published: boolean
  cover_photo_url: string | null
  counts: { rooms: number; units: number; available: number; not_ready: number }
  my_role: PropertyRole | null
  owner_name: string
}

export interface Property extends PropertySummary {
  description: string | null
  who_can_apply: string | null
  street: string | null
  barangay: string | null
  province: string | null
  latitude: number | null
  longitude: number | null
  published_at: string | null
  rooms: Room[]
  units: Unit[]
  utility_accounts: UtilityAccount[]
  photos: PropertyPhoto[]
  publish_checklist: ChecklistItem[]
  abilities: PropertyAbility[]
  caretakers: PropertyCaretakerAssignment[] | null
}

export type SettingsValues = Record<string, string | number | boolean | number[] | null>

export interface PropertySettings {
  values: SettingsValues
  defaults: SettingsValues
  sections: Record<string, string[]>
  updated_at: string | null
}

/** Units spec when creating a property or room, or switching a room's mode. */
export interface UnitSpec {
  capacity?: number
  rent_centavos?: number | null
  count?: number
  label_pattern?: string
  start_number?: number
}
