import type { BillKind, BillLineKind, PaymentMethod, PaymentStatus } from './enums'

/** Billing (C4) and payments (C6). Money is integer centavos. */

export interface BillLine {
  id: number
  kind: BillLineKind
  kind_label: string
  description: string
  amount_centavos: number
  reason: string | null
  adjusts_line_id: number | null
}

export type BillStatus = 'paid' | 'partly_paid' | 'unpaid'

export interface Bill {
  id: number
  number: string
  kind: BillKind
  kind_label: string
  property_id: number
  /** Only on the boarder's own list. */
  property_name?: string | null
  payer: { id: number; name: string | null }
  room_label: string | null
  tenancy_id: number | null
  period_start_on: string | null
  period_end_on: string | null
  issued_on: string
  due_on: string
  total_centavos: number
  /** Still owed after payments and credits. */
  balance_centavos: number
  status: BillStatus
  is_overdue: boolean
  /** Marked late after the grace days, with a numbered notice (NTC-…). */
  is_late: boolean
  late_notice_number: string | null
  /** No reminders or late marking while the owner checks it. */
  under_review: { since: string; reason: string | null; by?: string | null } | null
  lines: BillLine[]
}

export interface CollectionNote {
  id: number
  note: string
  promised_on: string | null
  by: string | null
  at: string | null
}

/** One payer on the overdue list (C7). */
export interface OverdueRow {
  payer: { id: number; name: string | null; phone: string | null }
  room_label: string | null
  overdue_centavos: number
  owed_centavos: number
  overdue_bills: number
  oldest_due_on: string
  days_overdue: number
  is_late: boolean
  under_review_bills: number
  last_reminded_on: string | null
  latest_note: CollectionNote | null
}

/** A short-lived link to a PDF that opens without signing in. */
export interface DocumentLink {
  url: string
  expires_in_minutes: number
}

export interface BillsMeta {
  current_page: number
  last_page: number
  total: number
  unpaid_count: number
  unpaid_total_centavos: number
}

/** Boarder: one place they stay or stayed, what they owe there and how to pay the owner. */
export interface MyPlace {
  property_id: number
  property_name: string
  owed_centavos: number
  credit_centavos: number
  pay_to: {
    gcash_name: string | null
    gcash_number: string | null
    bank_name: string | null
    bank_account_name: string | null
    bank_account_number: string | null
  } | null
}

export interface MyBillsMeta {
  current_page: number
  last_page: number
  total: number
  places: MyPlace[]
}

export interface Payment {
  id: number
  property_id: number
  property_name?: string | null
  payer: { id: number; name: string | null }
  amount_centavos: number
  method: PaymentMethod
  method_label: string
  reference: string | null
  proof_url: string | null
  paid_on: string
  note: string | null
  status: PaymentStatus
  status_label: string
  receipt_number: string | null
  submitted_by: string | null
  reported_by_payer: boolean
  decided_by: string | null
  decided_at: string | null
  reject_reason: string | null
  reversal?: { by: string | null; on: string; reason: string | null } | null
  /** Staff only: the reference no. was used on another payment to the same owner. */
  reference_reused?: boolean
  created_at: string | null
}

export interface PaymentsMeta {
  current_page: number
  last_page: number
  total: number
  pending_count: number
}

/** What one payer owes at a property, and their credit. */
export interface PayerBalance {
  owed_centavos: number
  credit_centavos: number
  bills: Bill[]
}

export interface PaymentInput {
  amount_centavos: number
  method: PaymentMethod
  paid_on: string
  reference?: string
  note?: string
  proof?: File | null
}

export interface UtilityShare {
  room_id: number
  room_label: string
  occupant_days: number
  amount_centavos: number
  leader: { id: number; name: string } | null
  waived: boolean
}

export interface UtilityBill {
  id: number
  account: { id: number; name: string | null; type: string | null }
  coverage_from_on: string
  coverage_to_on: string
  total_centavos: number
  shares: UtilityShare[]
  photo_url: string | null
  replaces_id: number | null
  correction_reason: string | null
  entered_by: string | null
  created_at: string | null
}

export interface UtilityBillInput {
  utility_account_id: number
  coverage_from_on: string
  coverage_to_on: string
  total_centavos: number
  waive_room_ids?: number[]
  photo?: File | null
}
