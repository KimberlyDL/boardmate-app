import type { DiscountKind, PaymentMethod, TenancyPaymentKind, TenancyStatus } from './enums'

/** The current leader of a room (C2). */
export interface RoomLeader {
  id: number
  room_id: number
  user: { id: number; name: string; photo_url: string | null }
  started_on: string
  consent_recorded_at: string
}

/** Someone who stays in a room rented whole. Emergency contacts reach staff only. */
export interface RoomOccupant {
  id: number
  room_id: number
  name: string
  contact_phone: string | null
  has_account: boolean
  /** The person who rents the room: cannot be removed or marked as left */
  is_leader_holder: boolean
  joined_on: string
  left_on: string | null
  is_staying: boolean
  emergency_contact?: { name: string; relationship: string | null; phone: string }
}

export interface EmergencyContact {
  name: string
  relationship: string | null
  phone: string
}

/** One row of a tenancy's "Agreed rate" discount history. */
export interface DiscountRow {
  id: number
  label: string
  kind: DiscountKind
  kind_label: string
  /** Centavos for a fixed discount, basis points (1000 = 10%) for a percent one */
  value: number
  effective_from: string
  effective_to: string | null
  status: 'scheduled' | 'active' | 'ended'
  set_by: string | null
}

export interface TenancyPaymentRow {
  id: number
  kind: TenancyPaymentKind
  kind_label: string
  amount_centavos: number
  method: PaymentMethod
  method_label: string
  received_on: string
  reference: string | null
}

export interface Tenancy {
  id: number
  status: TenancyStatus
  status_label: string
  property: { id: number; name: string }
  room: { id: number; code: string; rental_mode: 'whole' | 'bedspaces' }
  unit: { id: number; label: string; kind: 'whole' | 'bedspace' }
  tenant: { id: number; name: string; phone: string | null; photo_url: string | null; email?: string }
  moved_in_on: string
  /** The day after move-in */
  first_day_on: string
  anchor_day: number
  next_rent_due_on: string
  rent_centavos: number | null
  discount: { label: string; kind: DiscountKind; value: number; amount_centavos: number; effective_from: string } | null
  rent_after_discount_centavos: number | null
  scheduled_discount: { kind: DiscountKind; value: number; effective_from: string } | null
  emergency_contact: EmergencyContact
  house_rules_accepted_at: string | null
  created_at: string
  /** Tenant view only */
  is_leader?: boolean
  /** Staff view only */
  payments?: TenancyPaymentRow[]
  deposit_paid_centavos?: number
  first_rent_paid_centavos?: number
  activation_override?: { reason: string } | null
}

/** What a move-in would cost (the form's live preview). */
export interface MoveInQuote {
  rent_centavos: number
  discount_centavos: number
  rent_after_discount_centavos: number
  deposit_centavos: number
  first_rent_centavos: number
  activation_required: boolean
}

export interface MoveInPayment {
  amount_centavos: number
  method: PaymentMethod
  reference?: string
}

export interface PlannedOccupant {
  name: string
  contact_phone?: string | null
  emergency_contact_name?: string | null
  emergency_contact_relationship?: string | null
  emergency_contact_phone?: string | null
}

/** Body of a move-in (reservation or walk-in). */
export interface MoveInRequest {
  moved_in_on: string
  emergency_contact: { name: string; relationship?: string; phone: string }
  discount?: { kind: DiscountKind; value: number }
  deposit?: MoveInPayment
  first_rent?: MoveInPayment
  override_reason?: string
  leader_consent?: boolean
  make_leader?: boolean
  occupants?: PlannedOccupant[]
}

export interface WalkInRequest extends MoveInRequest {
  unit_id: number
  email: string
}

export interface NewOccupantInput {
  name: string
  contact_phone?: string
  email?: string
  joined_on: string
  emergency_contact_name: string
  emergency_contact_relationship?: string
  emergency_contact_phone: string
}
