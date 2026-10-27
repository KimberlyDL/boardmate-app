import type { DiscountKind, NoticeStatus, PaymentMethod, TenancyPaymentKind, TenancyStatus } from './enums'

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
  room: {
    id: number
    code: string
    door_no: string | null
    label: string
    rental_mode: 'whole' | 'bedspaces'
    let_whole: boolean
    /** Tenant view only: number of bedspaces (1 for a whole room) */
    total?: number
    /** Tenant view only: most people (whole room) or number of bedspaces */
    capacity?: number
  }
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
  /** C1: the approved last day of stay (the unit is free the day after). */
  end_on: string | null
  /** Past the end date and no move-out recorded. */
  is_overstaying: boolean
  moved_out_on: string | null
  /** A notice from the boarder waiting for approval. */
  pending_notice?: { id: number; end_on: string; is_short_notice: boolean; filed_at: string | null } | null
  /** Tenant view only */
  is_leader?: boolean
  /** Tenant view only: the place's notice rules (short notice is only flagged). */
  notice_rules?: { suggested_days: number | null; minimum_days: number | null }
  /** Tenant view only: the deposit was settled after move-out. */
  is_settled?: boolean
  /** D2: the place's curfew (HH:MM or null) and whether I muted the reminder */
  curfew?: { time: string | null; reminder_minutes: number; reminders_muted: boolean }
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
  /** D3: staff confirm the tenant accepted the house rules in force in person */
  house_rules_accepted_in_person?: boolean
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

/** An end date asked for or set (C1). */
export interface TenancyNotice {
  id: number
  end_on: string
  status: NoticeStatus
  status_label: string
  is_short_notice: boolean
  reason: string | null
  filed_by: string | null
  filed_at: string | null
  decided_by: string | null
  decided_at: string | null
  decline_reason: string | null
  /** Only on the "waiting for approval" list. */
  tenancy?: { id: number; tenant: { id: number; name: string; phone: string | null }; room_label: string; unit_label: string }
}

/** After a staff action on the end date or move-out. */
export interface TenancyState {
  id: number
  status: TenancyStatus
  status_label: string
  end_on: string | null
  unit_status: string
  moved_out_on?: string
  final_bill?: { id: number; number: string; total_centavos: number } | null
}

/** Before settling (C8): what the deposit would do now. */
export interface SettlementWorksheet {
  settled: false
  deposit_held_centavos: number
  owed_centavos: number
  credit_centavos: number
  suggested_apply_centavos: number
  suggested_refund_centavos: number
  still_owed_centavos: number
  rent_now_centavos: number | null
  deposit_gap_centavos: number
  unpaid_bills: { id: number; number: string; kind_label: string; due_on: string; balance_centavos: number }[]
}

/** After settling (C8). */
export interface SettlementResult {
  settled: true
  id: number
  deposit_held_centavos: number
  deductions: { bill_number: string; description: string; amount_centavos: number; reason: string }[]
  deductions_centavos: number
  applied_centavos: number
  kept_centavos: number
  kept_reason: string | null
  refund_centavos: number
  credit_returned_centavos: number
  still_owed_centavos: number
  refund_method: PaymentMethod | null
  refund_method_label: string | null
  refund_reference: string | null
  refunded_on: string | null
  note: string | null
  settled_by: string | null
  settled_at: string | null
}

export interface SettleInput {
  deductions: { description: string; amount_centavos: number; reason: string }[]
  keep_centavos?: number
  keep_reason?: string
  refund_method?: PaymentMethod
  refund_reference?: string
  refunded_on?: string
  note?: string
}
