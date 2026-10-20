import type { GroupExpenseKind, GroupRole, RepaymentMethod, RepaymentStatus, SplitMethod } from './enums'

/** A room's shared-contributions group (D5). Money is integer centavos. */

export interface GroupSummary {
  id: number
  room_label: string
  property_name: string
  my_role: GroupRole
  my_role_label: string
  is_current: boolean
}

export interface GroupMemberRow {
  id: number
  name: string
  role: GroupRole
  role_label: string
  has_account: boolean
  joined_on: string
  left_on: string | null
  is_me: boolean
}

export interface Group {
  id: number
  room: { id: number; label: string }
  property: { id: number; name: string }
  default_split_method: SplitMethod
  default_split_label: string
  /** "member" sees everything; "staff" (owner, caretakers) sees members and the owner's own bills. */
  view: 'member' | 'staff'
  me: { id: number; role: GroupRole; is_current: boolean } | null
  can_manage: boolean
  can_appoint_moderators: boolean
  members: GroupMemberRow[]
}

export interface GroupLine {
  id: number
  kind: GroupExpenseKind
  kind_label: string
  is_locked: boolean
  bill_number: string | null
  description: string
  amount_centavos: number
  spent_on: string
  paid_by: { id: number; name: string }
  adjusts_expense_id: number | null
  reason: string | null
  /** Members only */
  proof_url?: string | null
  added_by_me?: boolean
  split_method?: SplitMethod
  split_label?: string
  shares?: { member_id: number; name: string; amount_centavos: number }[]
  my_share_centavos?: number
}

export interface Balances {
  me: { owe_centavos: number; owed_to_me_centavos: number }
  pairs: { from: { id: number; name: string }; to: { id: number; name: string }; amount_centavos: number; involves_me: boolean }[]
}

export interface Repayment {
  id: number
  from: { id: number; name: string }
  to: { id: number; name: string }
  amount_centavos: number
  method: RepaymentMethod
  method_label: string
  reference: string | null
  proof_url: string | null
  note: string | null
  status: RepaymentStatus
  status_label: string
  decided_by: string | null
  reject_reason: string | null
  can_decide: boolean
  created_at: string | null
}

export interface ExpenseInput {
  description: string
  amount_centavos: number
  spent_on: string
  participants?: number[]
  method?: 'equal' | 'weights' | 'custom'
  weights?: Record<number, number>
  amounts?: Record<number, number>
  paid_by_member_id?: number
  proof?: File | null
}

export interface RepaymentInput {
  to_member_id: number
  from_member_id?: number
  amount_centavos: number
  method: RepaymentMethod
  reference?: string
  note?: string
  proof?: File | null
}
