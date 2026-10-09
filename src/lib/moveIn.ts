import { toCentavos } from './money'
import type { DiscountKind, PaymentMethod } from '@/types/enums'
import type { MoveInPayment, MoveInQuote, MoveInRequest, PlannedOccupant } from '@/types/tenancy'

/**
 * The move-in form's state and how it becomes an API request. Kept apart from
 * the screen so the rules (what counts as recorded, what is short) can be
 * tested: amounts are typed in pesos and sent as centavos; a percent discount
 * is typed as "10" and sent as basis points (1000).
 */

export interface PaymentForm {
  amount: string
  method: PaymentMethod
  reference: string
}

export interface OccupantForm {
  name: string
  contact_phone: string
  emergency_contact_name: string
  emergency_contact_relationship: string
  emergency_contact_phone: string
}

export interface MoveInForm {
  moved_in_on: string
  emergency: { name: string; relationship: string; phone: string }
  discountKind: DiscountKind | ''
  /** Pesos for a fixed discount, percent for a percent one */
  discountValue: string
  deposit: PaymentForm
  firstRent: PaymentForm
  overrideReason: string
  leaderConsent: boolean
  makeLeader: boolean
  occupants: OccupantForm[]
}

export function emptyOccupant(): OccupantForm {
  return { name: '', contact_phone: '', emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '' }
}

export function emptyPayment(): PaymentForm {
  return { amount: '', method: 'cash', reference: '' }
}

export function emptyMoveIn(today: string): MoveInForm {
  return {
    moved_in_on: today,
    emergency: { name: '', relationship: '', phone: '' },
    discountKind: '',
    discountValue: '',
    deposit: emptyPayment(),
    firstRent: emptyPayment(),
    overrideReason: '',
    leaderConsent: false,
    makeLeader: false,
    occupants: [],
  }
}

/** "10" or "7.5" → 1000 / 750 basis points; null when empty, zero or not a percentage up to 100. */
export function percentToBasisPoints(input: string): number | null {
  const clean = input.replace(/[%\s]/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null
  const bp = Math.round(Number(clean) * 100)
  return bp >= 1 && bp <= 10000 ? bp : null
}

/** The discount to send (and preview), or undefined when none is chosen or the value is not usable yet. */
export function discountOf(form: Pick<MoveInForm, 'discountKind' | 'discountValue'>): { kind: DiscountKind; value: number } | undefined {
  if (form.discountKind === '') return undefined
  const value = form.discountKind === 'percent' ? percentToBasisPoints(form.discountValue) : toCentavos(form.discountValue)
  return value && value > 0 ? { kind: form.discountKind, value } : undefined
}

/** A recorded payment, or undefined when nothing (or zero) was received. */
export function paymentOf(p: PaymentForm): MoveInPayment | undefined {
  const amount = toCentavos(p.amount)
  if (!amount) return undefined
  return { amount_centavos: amount, method: p.method, ...(p.reference.trim() ? { reference: p.reference.trim() } : {}) }
}

/** What the quote asks for and the form has not recorded in full, in centavos (0 = fine). */
export function shortfalls(form: Pick<MoveInForm, 'deposit' | 'firstRent'>, quote: MoveInQuote | null): { deposit: number; firstRent: number } {
  if (!quote || !quote.activation_required) return { deposit: 0, firstRent: 0 }
  const missing = (expected: number, p: PaymentForm) => Math.max(0, expected - (paymentOf(p)?.amount_centavos ?? 0))
  return { deposit: missing(quote.deposit_centavos, form.deposit), firstRent: missing(quote.first_rent_centavos, form.firstRent) }
}

export function needsOverride(form: Pick<MoveInForm, 'deposit' | 'firstRent'>, quote: MoveInQuote | null): boolean {
  const s = shortfalls(form, quote)
  return s.deposit > 0 || s.firstRent > 0
}

function occupantOf(o: OccupantForm): PlannedOccupant {
  const out: PlannedOccupant = { name: o.name.trim() }
  if (o.contact_phone.trim()) out.contact_phone = o.contact_phone.trim()
  if (o.emergency_contact_name.trim()) out.emergency_contact_name = o.emergency_contact_name.trim()
  if (o.emergency_contact_relationship.trim()) out.emergency_contact_relationship = o.emergency_contact_relationship.trim()
  if (o.emergency_contact_phone.trim()) out.emergency_contact_phone = o.emergency_contact_phone.trim()
  return out
}

/**
 * The request for a move-in. In a room rented whole the tenant leads it and
 * brings the people who will stay; in a bedspace room `makeLeader` decides.
 * Leader consent is sent whenever the tenant becomes the leader.
 */
export function buildMoveIn(form: MoveInForm, room: { whole: boolean }): MoveInRequest {
  const body: MoveInRequest = {
    moved_in_on: form.moved_in_on,
    emergency_contact: {
      name: form.emergency.name.trim(),
      phone: form.emergency.phone.trim(),
      ...(form.emergency.relationship.trim() ? { relationship: form.emergency.relationship.trim() } : {}),
    },
  }

  const discount = discountOf(form)
  if (discount) body.discount = discount
  const deposit = paymentOf(form.deposit)
  if (deposit) body.deposit = deposit
  const firstRent = paymentOf(form.firstRent)
  if (firstRent) body.first_rent = firstRent
  if (form.overrideReason.trim()) body.override_reason = form.overrideReason.trim()

  const leads = room.whole || form.makeLeader
  if (leads) body.leader_consent = form.leaderConsent
  if (room.whole) {
    body.occupants = form.occupants.filter((o) => o.name.trim() !== '').map(occupantOf)
  } else if (form.makeLeader) {
    body.make_leader = true
  }

  return body
}
