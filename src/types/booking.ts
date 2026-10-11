import type { ApplicationStatus } from './enums'
import type { PlannedOccupant } from './tenancy'

export interface ListingSummary {
  id: number
  name: string
  type: string
  type_label: string
  rental_mode: 'whole' | 'bedspaces' | 'mixed'
  barangay: string | null
  city: string | null
  province: string | null
  latitude: number | null
  longitude: number | null
  who_can_apply: string | null
  price_from_centavos: number | null
  /** No free room right now (still shown, after the places with one) */
  is_full: boolean
  /** Straight-line metres from the search's `near` point, when one was sent */
  distance_m: number | null
  availability: { available: number; total: number; label: string }
  included_utilities: string[]
  cover_photo_url: string | null
  owner_name: string
  published_at: string | null
}

/** A campus the Finder measures distance from (the admin keeps the list). */
export interface Campus {
  id: number
  name: string
  latitude: number
  longitude: number
  is_default: boolean
}

/** A room on "Rooms & availability" (public: never who lives there). */
export interface PublicRoom {
  id: number
  /** Door number when set, else the code */
  label: string
  code: string
  door_no: string | null
  floor: number | null
  rental_mode: 'whole' | 'bedspaces'
  rental_mode_label: string
  who_can_stay: string
  who_can_stay_label: string
  status: 'available' | 'full' | 'not_ready'
  available: number
  total: number
  /** Most people (whole room) or number of bedspaces */
  capacity: number
  /** Cheapest current rent among its free places (or all, when full) */
  rent_from_centavos: number | null
  availability_label: string
  /** A bedspace room the owner also rents as one room; available only while every bedspace is free */
  whole_option: { available: boolean; rent_centavos: number | null; capacity: number } | null
}

export interface ListingDetail extends ListingSummary {
  description: string | null
  street: string | null
  /** 1600 px WebP, for the gallery */
  photos: string[]
  /** 480 px WebP versions, same order as `photos` */
  photo_thumbs: string[]
  rooms: PublicRoom[]
  slots: { id: number; label: string; kind: string; room: { id: number; code: string; door_no: string | null; label: string; floor: number | null; who_can_stay: string; who_can_stay_label: string } | null; capacity: number; rent_centavos: number | null }[]
  utilities: {
    type: string
    name: string
    method: string
    method_label: string
    billed_by: 'owner' | 'group'
    amount_centavos: number | null
  }[]
  deposit: { rule: string | null; label: string | null; fixed_centavos: number | null }
  curfew_time: string | null
  house_rules_summary: string | null
}

export interface BookingApplication {
  id: number
  status: ApplicationStatus
  status_label: string
  property: {
    id: number
    name: string
    area: string
    address: string | null
    cover_photo_url: string | null
    rental_mode: 'whole' | 'bedspaces' | 'mixed' | null
    owner_name: string
  }
  /** The room the boarder asked for */
  room: { id: number; label: string } | null
  /** They asked for the whole room */
  wants_whole: boolean
  /** The reserved unit; its room can differ from the one asked for */
  unit: { id: number; label: string; room_id: number | null; room_label: string | null; rent_centavos: number | null } | null
  planned_move_in_on: string
  message: string | null
  reserved_until: string | null
  closed_reason: string | null
  decided_at: string | null
  closed_at: string | null
  created_at: string
  can_cancel: boolean
  /** The applicant will lead their room when they move in */
  leader_on_move_in: boolean
  // Reviewer view only
  applicant?: { id: number; name: string; email: string; phone: string; photo_url: string | null }
  id_document_url?: string | null
  id_document_purged?: boolean
  decided_by?: string | null
  /** Others who will stay, noted at approval (a room rented whole); with emergency contacts */
  planned_occupants?: PlannedOccupant[]
}

export interface BookableUnit {
  id: number
  room_id: number | null
  room_code: string | null
  /** The door number when set, else the code */
  room_label: string | null
  label: string
  kind: 'whole' | 'bedspace'
  /** The "rent the whole room" unit of a bedspace room */
  is_whole_option?: boolean
  /** Most people a whole room fits */
  capacity: number
  room_has_leader: boolean
  rent_centavos: number | null
}
