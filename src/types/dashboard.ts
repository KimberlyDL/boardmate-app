import type { AuditEntry } from '@/services/audit'

/** One property's dashboard (A10). Money is integer centavos; a widget the viewer may not see is null. */
export interface PropertyDashboard {
  property: { id: number; name: string }
  occupancy: { rooms: number; places: number; occupied: number; reserved: number; available: number; not_ready: number }
  due_this_week: { bills: number; centavos: number } | null
  overdue: { payers: number; centavos: number } | null
  collected_this_month: number | null
  applications_waiting: number | null
  proofs_waiting: number | null
  repairs: { open: number; urgent: number } | null
  house_operations: { visitors_today: number; overnight_waiting: number; late_entries_waiting: number; repeated_late: number } | null
  unpaid_shared_bills: { room: { id: number; label: string }; billed_to: string | null; centavos: number; overdue: boolean }[] | null
}

export interface MyDashboard {
  properties: PropertyDashboard[]
  /** Owner only */
  recent_activity: AuditEntry[] | null
}

/** The tenant's home (A10). Everything but the notifications count is null when not staying anywhere. */
export interface TenantHome {
  stay: {
    id: number
    property: { id: number; name: string }
    room_label: string | null
    unit_label: string | null
    emergency_numbers: string | null
    leaving: { end_on: string; approved: boolean } | null
  } | null
  money: {
    owed_centavos: number
    credit_centavos: number
    overdue_centavos: number
    next_bill: { id: number; number: string; due_on: string; balance_centavos: number } | null
  } | null
  requests: { repairs_open: number; repairs_to_confirm: number; late_entries_waiting: number; visitors_waiting: number } | null
  group: {
    id: number
    owe_centavos: number
    owed_to_me_centavos: number
    is_leader: boolean
    /** Leaders only */
    members_owing_me: { name: string | null; amount_centavos: number }[] | null
  } | null
  house_rules_to_accept: boolean
  unread_notifications: number
}

/** GET me/spending: my last 12 months across every place I stayed (A11). Centavos. */
export interface TenantSpending {
  period: { from: string; to: string }
  /** Oldest first. `group` is my share of the room group's costs (not bills billed to me). */
  months: { month: string; rent: number; utilities: number; other: number; paid: number; group: number }[]
  totals: { rent: number; utilities: number; other: number; billed: number; paid: number; group: number }
  deposits: { paid: number; held: number; refunded: number; kept: number }
}

/** GET admin/stats: the platform admin's numbers (A11). Counts only, never money. */
export interface PlatformStats {
  /** Everyone but platform admins; one account can hold several roles. */
  accounts: { total: number; new_this_month: number; suspended: number; boarders: number; owners: number; caretakers: number }
  owners: { pending: number; verified: number; rejected: number; suspended: number }
  listings: { on_finder: number; with_free_places: number; not_published: number; places: number; free_places: number }
  stays: { current: number; applications_waiting: number }
  campuses: number
  /** The 12 months ending this month, oldest first. */
  months: { month: string; sign_ups: number; applications: number; approved: number; move_ins: number }[]
}
