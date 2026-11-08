/**
 * Finances for the owner and Managers (A11). Money is integer centavos. Billed,
 * collected, collection, deposits received / refunded / kept, utilities and
 * repair costs are for the period; outstanding, credit, deposits held and
 * occupancy are as of today.
 */

export interface FinancePeriod {
  from: string
  to: string
}

export interface FinanceRef {
  id: number
  name: string
}

export interface FinanceRoomRef {
  id: number
  label: string
  floor: number | null
}

export interface OutstandingAgeing {
  not_due: number
  days_1_30: number
  days_31_60: number
  days_61_90: number
  over_90: number
}

/** One group's figures: all properties, a property, or a room. */
export interface FinanceFigures {
  billed: { rent: number; fixed_utilities: number; utility_shares: number; charges: number; corrections: number; total: number }
  /** `unapplied` (money not yet applied to a bill) is null by room. */
  collected: { payments: number; first_rent: number; total: number; unapplied: number | null }
  /** The deposit used at settlement: not new money, so not in `collected`. */
  paid_from_deposit: number
  /** Of the bills due in the period, how much is paid; `rate` 0–1, null when nothing was due. */
  collection: { due: number; paid: number; rate: number | null }
  outstanding: { total: number; overdue: number; under_review: number; ageing: OutstandingAgeing }
  /** Null by room. */
  credit_held: number | null
  deposits: { received: number; held: number; refunded: number; kept: number }
  /** `provider_cost` and `waived` are null by room (provider bills are per property). */
  utilities: { billed: number; provider_cost: number | null; waived: number | null }
  repair_costs: number
  occupancy: { places: number; occupied: number }
}

/** The period just before, for "vs last period" (only the figures that change by period). */
export interface FinancePrevious {
  period: FinancePeriod
  billed: number
  collected: number
  collection_rate: number | null
  deposits_received: number
  utilities_billed: number
  provider_cost: number | null
  repair_costs: number
}

export interface FinanceMonth {
  /** YYYY-MM */
  month: string
  billed: number
  collected: number
}

/** Places taken at the end of a month (today for this month). `rate` is null when there were no places. */
export interface OccupancyMonth {
  /** YYYY-MM */
  month: string
  places: number
  occupied: number
  rate: number | null
}

/** Repairs and late entries in the period (FR-87), with the period before. */
export interface HouseFigures {
  repairs: {
    reported: number
    fixed: number
    cancelled: number
    /** Days from reported to fixed, for repairs fixed in the period; null when none. */
    average_days_to_fix: number | null
    /** As of today, whatever the period. */
    open_now: number
    urgent_open_now: number
    /** Reported in the period, most first, empty kinds left out. */
    by_kind: { kind: string; label: string; count: number }[]
  }
  late_entries: {
    requests: { approved: number; declined: number; waiting: number; cancelled: number }
    /** Nights back after curfew without approval. */
    curfew_violations: number
    /** Violations in the period that put a stay on the list. */
    repeat_count: number
    repeated: { stay: { id: number; tenant: string | null; room: string | null }; nights: number }[]
  }
  previous: { repairs_reported: number; repairs_fixed: number; late_requests: number; curfew_violations: number }
}

/** GET finance: every property I see finances of, or one. */
export interface PortfolioFinance {
  /** Every property I may pick. */
  properties: FinanceRef[]
  period: FinancePeriod
  totals: FinanceFigures
  previous: FinancePrevious
  by_property: (FinanceFigures & { property: FinanceRef })[]
  /** 12 months ending with the period's last month, oldest first. */
  series: FinanceMonth[]
  /** Places taken, the same 12 months. */
  occupancy_series: OccupancyMonth[]
  house: HouseFigures
}

/** GET properties/{p}/finance: a property by room. `room` null = money of rooms since deleted. */
export interface PropertyFinance {
  property: FinanceRef
  period: FinancePeriod
  totals: FinanceFigures
  previous: FinancePrevious
  rooms: (FinanceFigures & { room: FinanceRoomRef | null })[]
  series: FinanceMonth[]
  occupancy_series: OccupancyMonth[]
  house: HouseFigures
}

/** A stay's totals since move-in, as of today. */
export interface StayTotals {
  billed: number
  paid: number
  paid_from_deposit: number
  balance: number
  overdue: number
  deposit_received: number
  deposit_held: number
}

export interface FinanceStayRef {
  id: number
  status: string
  tenant: { id: number; name: string | null }
  unit: { id: number; label: string } | null
  moved_in_on: string | null
  moved_out_on: string | null
}

/** GET rooms/{r}/finance: a room by stay. */
export interface RoomFinance {
  property: FinanceRef
  room: FinanceRoomRef
  period: FinancePeriod
  totals: FinanceFigures
  previous: FinancePrevious
  /** Stays in the room during the period, newest first. */
  stays: (StayTotals & { stay: FinanceStayRef })[]
  series: FinanceMonth[]
  occupancy_series: OccupancyMonth[]
  house: HouseFigures
}

/** GET tenancies/{t}/finance: one stay from move-in to today. */
export interface StayFinance {
  stay: FinanceStayRef & {
    property: FinanceRef
    room: { id: number; label: string } | null
  }
  totals: StayTotals
  move_in: {
    kind: string
    kind_label: string
    amount_centavos: number
    method: string
    method_label: string
    received_on: string | null
    reference: string | null
  }[]
  bills: {
    id: number
    number: string
    kind: string
    kind_label: string
    period_start_on: string | null
    period_end_on: string | null
    issued_on: string
    due_on: string
    total_centavos: number
    balance_centavos: number
    overdue: boolean
    under_review: boolean
    late: boolean
  }[]
  payments: {
    id: number
    receipt_number: string | null
    paid_on: string
    method: string
    method_label: string
    amount_centavos: number
    applied_centavos: number
  }[]
  settlement: {
    id: number
    deposit_held_centavos: number
    deductions_centavos: number
    applied_centavos: number
    refund_centavos: number
    kept_centavos: number
    kept_reason: string | null
    still_owed_centavos: number
    refunded_on: string | null
    settled_on: string | null
  } | null
}

/** GET me/collections: what the people who follow up payments see (Collectors included). No income, costs or deposits. */
export interface CollectionsSummary {
  properties: FinanceRef[]
  /** The last 7 days, today included. */
  week: FinancePeriod
  received: { payments: number; centavos: number; by_day: { date: string; payments: number; centavos: number }[] }
  /** Unpaid bills due today or in the next 6 days. */
  due_soon: { bills: number; centavos: number }
  overdue: { payers: number; bills: number; centavos: number; late_payers: number; under_review_bills: number }
  /** Who is behind, by how late their oldest overdue bill is. */
  behind: Record<'days_1_30' | 'days_31_60' | 'days_61_90' | 'over_90', { payers: number; centavos: number }>
  /** Null when I may not confirm payment proofs anywhere. */
  proofs_waiting: number | null
  /** The five payers most behind, most days first. */
  most_behind: {
    property: FinanceRef
    payer: { id: number; name: string | null; phone: string | null }
    room_label: string | null
    overdue_centavos: number
    days_overdue: number
    is_late: boolean
    promised_on: string | null
  }[]
}
