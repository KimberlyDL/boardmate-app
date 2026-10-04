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
const BOOKINGS = 'bookings'
const OPERATIONS = 'house operations'

export const SETTING_SECTIONS: SettingSection[] = [
  {
    id: 'rent',
    title: 'Rent and due dates',
    fields: [
      {
        key: 'due_date_policy', label: 'When rent is due', type: 'select', key_setting: true, pending: BILLING,
        options: [
          { value: 'anniversary', label: "Each boarder's move-in date" },
          { value: 'common', label: 'One date for everyone' },
          { value: 'hybrid', label: 'Rent on move-in date, utilities on one date' },
        ],
      },
      {
        key: 'common_due_day', label: 'Day of the month everyone pays', type: 'int', unit: 'day', key_setting: true,
        showIf: (v) => v.due_date_policy !== 'anniversary',
      },
      {
        key: 'partial_period_handling', label: "A newcomer's first partial month", type: 'select',
        showIf: (v) => v.due_date_policy !== 'anniversary',
        options: [
          { value: 'prorated', label: 'Charge only the days stayed (÷ 30)' },
          { value: 'full_shifted', label: 'One full rent, longer first period' },
          { value: 'waived', label: 'Free until the common due date' },
        ],
      },
      {
        key: 'activation_required', label: 'Deposit and first rent before move-in', type: 'bool', pending: BOOKINGS,
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
      {
        key: 'overstay_daily_centavos', label: 'Overstay charge per day', type: 'money',
        help: 'Leave empty to use monthly rent ÷ 30.', pending: BILLING,
      },
    ],
  },
  {
    id: 'move_out',
    title: 'Notice and move-out',
    fields: [
      { key: 'minimum_notice_days', label: 'Minimum notice', type: 'int', unit: 'days', help: 'Leave empty for no minimum.' },
      { key: 'suggested_notice_days', label: 'Notice suggested to boarders', type: 'int', unit: 'days' },
      {
        key: 'short_notice_consequence', label: 'If notice is too short', type: 'select',
        options: [
          { value: 'none', label: 'Nothing (just flag it)' },
          { value: 'fixed_fee', label: 'Fixed fee' },
          { value: 'deposit_deduction', label: 'Deduct from deposit' },
        ],
      },
      { key: 'short_notice_fee_centavos', label: 'Short-notice fee', type: 'money', showIf: (v) => v.short_notice_consequence !== 'none' },
      {
        key: 'final_utility_handling', label: 'Last utility bill after move-out', type: 'select', pending: BILLING,
        options: [
          { value: 'no_holdback', label: 'No holdback (refund deposit in full)' },
          { value: 'holdback_true_up', label: 'Hold back an amount, settle later' },
          { value: 'estimate_and_close', label: 'Charge an estimate and close' },
        ],
      },
      {
        key: 'final_utility_holdback_centavos', label: 'Amount to hold back', type: 'money',
        showIf: (v) => v.final_utility_handling === 'holdback_true_up',
      },
    ],
  },
  {
    id: 'utilities',
    title: 'Utility bills',
    fields: [
      {
        key: 'split_manager', label: 'Who splits utility bills', type: 'select',
        options: [
          { value: 'owner', label: 'Owner' },
          { value: 'lease_holder', label: 'Lease holder' },
        ],
      },
      {
        key: 'split_method', label: 'How bills are split', type: 'select', pending: BILLING,
        options: [
          { value: 'occupant_days', label: 'By days stayed' },
          { value: 'equal', label: 'Equally' },
          { value: 'weights', label: 'By weight' },
          { value: 'custom', label: 'Fixed amounts' },
        ],
      },
      {
        key: 'utility_due_rule', label: 'When a utility bill is due', type: 'select',
        options: [
          { value: 'days_after_issue', label: 'A set number of days after it is entered' },
          { value: 'with_next_rent', label: 'With the next rent' },
        ],
      },
      { key: 'utility_due_days', label: 'Days after it is entered', type: 'int', unit: 'days', showIf: (v) => v.utility_due_rule === 'days_after_issue' },
    ],
  },
  {
    id: 'payments',
    title: 'Payments, reminders and late payers',
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
        key: 'late_fee_type', label: 'Late fee', type: 'select',
        options: [
          { value: 'off', label: 'Off' },
          { value: 'fixed', label: 'Fixed amount' },
          { value: 'percentage', label: 'Percentage of the charge' },
        ],
        help: 'Charged once per overdue rent, never automatically on utilities.',
      },
      { key: 'late_fee_fixed_centavos', label: 'Late fee amount', type: 'money', showIf: (v) => v.late_fee_type === 'fixed' },
      { key: 'late_fee_basis_points', label: 'Late fee percentage', type: 'percent', showIf: (v) => v.late_fee_type === 'percentage' },
      { key: 'arrears_enabled', label: 'Formal demand for long arrears', type: 'bool' },
      { key: 'arrears_days', label: 'After days overdue', type: 'int', unit: 'days', showIf: (v) => !!v.arrears_enabled },
      { key: 'notice_to_vacate_min_days', label: 'Notice to vacate: no earlier than', type: 'int', unit: 'days overdue', help: 'Always sent by you, never automatically.' },
      { key: 'notice_to_vacate_end_days', label: 'Notice to vacate: end date after', type: 'int', unit: 'days' },
      { key: 'early_warning_enabled', label: 'Warn me about repeat late payers', type: 'bool' },
      { key: 'early_warning_late_count', label: 'Late payments', type: 'int', showIf: (v) => !!v.early_warning_enabled },
      { key: 'early_warning_window_periods', label: '… within the last', type: 'int', unit: 'months', showIf: (v) => !!v.early_warning_enabled },
      { key: 'payment_promise_max_days', label: 'Payment promise up to', type: 'int', unit: 'days' },
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
    fields: [{ key: 'reservation_expiry_days', label: 'Reservation expires after', type: 'int', unit: 'days without move-in', pending: BOOKINGS }],
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
