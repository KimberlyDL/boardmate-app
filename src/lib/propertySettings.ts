/**
 * How each property setting is shown and edited. Keys match the API
 * (property_settings columns); defaults come from the API.
 */

export type FieldType = 'bool' | 'int' | 'money' | 'percent' | 'select' | 'time' | 'day-list'

export interface SettingField {
  key: string
  label: string
  type: FieldType
  help?: string
  options?: { value: string; label: string }[]
  /** Only show when this returns true for the current values. */
  showIf?: (v: Record<string, unknown>) => boolean
  /** Key settings shown in the setup wizard; the rest sit under "More settings". */
  key_setting?: boolean
  /** Shown with "Applies once … is available" until that phase ships. */
  pending?: string
  unit?: string
}

export interface SettingSection {
  id: string
  title: string
  fields: SettingField[]
}

const BILLING = 'billing'
const OPERATIONS = 'house operations'

export const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'rent',
    title: 'Rent and deposit',
    fields: [
      {
        key: 'activation_required', label: 'Deposit and first rent before move-in', type: 'bool',
        help: 'You can still allow a move-in without them, with a reason.',
      },
      {
        key: 'deposit_rule', label: 'Deposit', type: 'select', key_setting: true,
        options: [
          { value: 'one_month_rent', label: "One month's rent" },
          { value: 'fixed_amount', label: 'Fixed amount' },
          { value: 'none', label: 'No deposit' },
        ],
      },
      { key: 'deposit_fixed_centavos', label: 'Deposit amount', type: 'money', key_setting: true, showIf: (v) => v.deposit_rule === 'fixed_amount' },
      { key: 'price_change_notice_days', label: 'Notice before a price change', type: 'int', unit: 'days' },
    ],
  },
  {
    id: 'move_out',
    title: 'Notice',
    fields: [
      { key: 'minimum_notice_days', label: 'Minimum notice', type: 'int', unit: 'days', help: 'Leave empty for no minimum.' },
      { key: 'suggested_notice_days', label: 'Notice suggested to boarders', type: 'int', unit: 'days' },
    ],
  },
  {
    id: 'utilities',
    title: 'Utility bills',
    fields: [
      {
        key: 'split_method', label: 'How bills are split', type: 'select', pending: BILLING,
        options: [
          { value: 'occupant_days', label: 'By days stayed' },
          { value: 'equal', label: 'Equally' },
          { value: 'weights', label: 'By weight' },
          { value: 'custom', label: 'Fixed amounts' },
        ],
      },
      { key: 'utility_due_days', label: 'Utility bill is due after it is entered', type: 'int', unit: 'days' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments and reminders',
    fields: [
      { key: 'grace_days', label: 'Grace days after the due date', type: 'int', unit: 'days', key_setting: true, pending: BILLING },
      { key: 'remind_before_due', label: 'Remind before the due date', type: 'bool' },
      { key: 'remind_before_days', label: 'Days before', type: 'int', unit: 'days', showIf: (v) => !!v.remind_before_due },
      { key: 'remind_on_due', label: 'Remind on the due date', type: 'bool' },
      { key: 'remind_overdue', label: 'Remind while overdue', type: 'bool' },
      { key: 'overdue_reminder_days', label: 'On overdue days', type: 'day-list', help: 'e.g. 1, 3', showIf: (v) => !!v.remind_overdue },
      { key: 'mark_late_enabled', label: 'Mark as late after the grace days', type: 'bool' },
      { key: 'mark_late_day', label: 'Mark late on day', type: 'int', showIf: (v) => !!v.mark_late_enabled },
      {
        key: 'correction_credit_handling', label: 'Credit from a corrected bill', type: 'select',
        options: [
          { value: 'roll_forward', label: 'Roll forward to the next bill' },
          { value: 'refund', label: 'Refund' },
        ],
      },
    ],
  },
  {
    id: 'booking',
    title: 'Bookings',
    fields: [{ key: 'reservation_expiry_days', label: 'Reservation expires after', type: 'int', unit: 'days without move-in' }],
  },
  {
    id: 'curfew',
    title: 'Curfew',
    fields: [
      { key: 'curfew_time', label: 'Curfew time', type: 'time', key_setting: true, help: 'Leave empty for no curfew.', pending: OPERATIONS },
      { key: 'curfew_reminder_minutes', label: 'Remind boarders before curfew', type: 'int', unit: 'minutes', showIf: (v) => !!v.curfew_time },
    ],
  },
  {
    id: 'visitors',
    title: 'Visitors',
    fields: [
      { key: 'overnight_requires_approval', label: 'Overnight stays need approval', type: 'bool', pending: OPERATIONS },
      { key: 'overnight_limit_per_month', label: 'Overnight stays per boarder per month', type: 'int', unit: 'nights' },
      { key: 'extra_occupant_fee_enabled', label: 'Extra-occupant fee', type: 'bool' },
      { key: 'extra_occupant_fee_centavos', label: 'Fee amount', type: 'money', showIf: (v) => !!v.extra_occupant_fee_enabled },
      { key: 'visitor_hours_start', label: 'Visitor hours from', type: 'time' },
      { key: 'visitor_hours_end', label: 'Visitor hours until', type: 'time' },
    ],
  },
]
