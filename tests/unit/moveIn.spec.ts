import { describe, expect, test } from 'vitest'
import { buildMoveIn, discountOf, emptyMoveIn, emptyOccupant, needsOverride, paymentOf, percentToBasisPoints, shortfalls } from '@/lib/moveIn'
import type { MoveInQuote } from '@/types/tenancy'

/** Kim's house: rent ₱4,500, agreed rate ₱500 off, so ₱4,000 deposit and ₱4,000 first rent. */
const kimsQuote: MoveInQuote = {
  rent_centavos: 450000,
  discount_centavos: 50000,
  rent_after_discount_centavos: 400000,
  deposit_centavos: 400000,
  first_rent_centavos: 400000,
  activation_required: true,
}

function filled() {
  const form = emptyMoveIn('2026-10-25')
  form.emergency = { name: ' Marta Santos ', relationship: 'Mother', phone: '0917 555 0000' }
  form.deposit.amount = '4,000'
  form.firstRent.amount = '4000'
  return form
}

describe('move-in discount', () => {
  test('percent is typed as a percentage and sent as basis points', () => {
    expect(percentToBasisPoints('10')).toBe(1000)
    expect(percentToBasisPoints('7.5%')).toBe(750)
    expect(percentToBasisPoints('0')).toBeNull()
    expect(percentToBasisPoints('101')).toBeNull()
    expect(percentToBasisPoints('ten')).toBeNull()
  })

  test('a fixed discount is typed in pesos and sent as centavos; nothing is sent until it is usable', () => {
    expect(discountOf({ discountKind: 'fixed', discountValue: '500' })).toEqual({ kind: 'fixed', value: 50000 })
    expect(discountOf({ discountKind: 'percent', discountValue: '10' })).toEqual({ kind: 'percent', value: 1000 })
    expect(discountOf({ discountKind: '', discountValue: '500' })).toBeUndefined()
    expect(discountOf({ discountKind: 'fixed', discountValue: '' })).toBeUndefined()
  })
})

describe('what counts as recorded', () => {
  test('blank or zero amounts are not payments', () => {
    expect(paymentOf({ amount: '', method: 'cash', reference: '' })).toBeUndefined()
    expect(paymentOf({ amount: '0', method: 'cash', reference: '' })).toBeUndefined()
    expect(paymentOf({ amount: '4,000', method: 'bank_transfer', reference: ' TX-1 ' })).toEqual({
      amount_centavos: 400000,
      method: 'bank_transfer',
      reference: 'TX-1',
    })
  })

  test('the deposit and first rent must cover the quote, or the move-in needs an override', () => {
    const form = filled()
    expect(shortfalls(form, kimsQuote)).toEqual({ deposit: 0, firstRent: 0 })
    expect(needsOverride(form, kimsQuote)).toBe(false)

    form.firstRent.amount = '1000'
    expect(shortfalls(form, kimsQuote)).toEqual({ deposit: 0, firstRent: 300000 })
    expect(needsOverride(form, kimsQuote)).toBe(true)

    form.deposit.amount = ''
    expect(shortfalls(form, kimsQuote).deposit).toBe(400000)
  })

  test('nothing is short when the property does not require activation, or before there is a quote', () => {
    const form = emptyMoveIn('2026-10-25')
    expect(needsOverride(form, { ...kimsQuote, activation_required: false })).toBe(false)
    expect(needsOverride(form, null)).toBe(false)
  })
})

describe('the move-in request', () => {
  test('a room rented whole: the tenant leads it, with consent and the people who will stay', () => {
    const form = filled()
    form.discountKind = 'fixed'
    form.discountValue = '500'
    form.leaderConsent = true
    form.occupants = [
      { ...emptyOccupant(), name: ' Ericka Cruz ', emergency_contact_name: 'Marta Cruz', emergency_contact_phone: '0918 111 2222' },
      emptyOccupant(), // a blank row is dropped
    ]

    expect(buildMoveIn(form, { whole: true })).toEqual({
      moved_in_on: '2026-10-25',
      emergency_contact: { name: 'Marta Santos', phone: '0917 555 0000', relationship: 'Mother' },
      discount: { kind: 'fixed', value: 50000 },
      deposit: { amount_centavos: 400000, method: 'cash' },
      first_rent: { amount_centavos: 400000, method: 'cash' },
      leader_consent: true,
      occupants: [{ name: 'Ericka Cruz', emergency_contact_name: 'Marta Cruz', emergency_contact_phone: '0918 111 2222' }],
    })
  })

  test('a bedspace: no occupants; leader fields only when the tenant becomes the leader', () => {
    const form = filled()
    form.occupants = [{ ...emptyOccupant(), name: 'Ignored' }]

    const plain = buildMoveIn(form, { whole: false })
    expect(plain).not.toHaveProperty('occupants')
    expect(plain).not.toHaveProperty('leader_consent')
    expect(plain).not.toHaveProperty('make_leader')

    form.makeLeader = true
    form.leaderConsent = true
    expect(buildMoveIn(form, { whole: false })).toMatchObject({ make_leader: true, leader_consent: true })
  })

  test('the override reason is sent only when one is written', () => {
    const form = filled()
    expect(buildMoveIn(form, { whole: false })).not.toHaveProperty('override_reason')
    form.overrideReason = '  Trusted, pays Friday '
    expect(buildMoveIn(form, { whole: false }).override_reason).toBe('Trusted, pays Friday')
  })
})
