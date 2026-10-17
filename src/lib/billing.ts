import type { Bill } from '@/types/billing'
import { PaymentMethodLabels, type PaymentMethod, type PaymentStatus } from '@/types/enums'

/** Methods a person records or reports by hand; "deposit" is only used at settlement. */
export const manualPaymentMethods = Object.fromEntries(
  Object.entries(PaymentMethodLabels).filter(([value]) => value !== 'deposit'),
) as Partial<Record<PaymentMethod, string>>
import type { Tenancy } from '@/types/tenancy'

/** Someone who can pay at a property: a current tenant (room leaders included). */
export interface Payer {
  id: number
  name: string
  tenancy_id: number
  room_label: string
  unit_label: string
}

export const toPayers = (tenancies: Tenancy[]): Payer[] =>
  tenancies
    .map((t) => ({ id: t.tenant.id, name: t.tenant.name, tenancy_id: t.id, room_label: t.room.label, unit_label: t.unit.label }))
    .sort((a, b) => a.name.localeCompare(b.name))

export function billStatus(bill: Pick<Bill, 'status' | 'is_overdue'>): { label: string; color: string } {
  if (bill.status === 'paid') return { label: 'Paid', color: 'success' }
  if (bill.is_overdue) return { label: bill.status === 'partly_paid' ? 'Partly paid · overdue' : 'Overdue', color: 'danger' }
  return bill.status === 'partly_paid' ? { label: 'Partly paid', color: 'warning' } : { label: 'Unpaid', color: 'medium' }
}

export const paymentColor: Record<PaymentStatus, string> = {
  pending: 'warning',
  confirmed: 'success',
  rejected: 'medium',
  reversed: 'danger',
}
