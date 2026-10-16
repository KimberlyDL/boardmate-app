import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import BillModal from '@/components/billing/BillModal.vue'
import OverdueList from '@/components/billing/OverdueList.vue'
import { billingService } from '@/services/billing'
import type { Bill, OverdueRow } from '@/types/billing'
import type { Property } from '@/types/property'

vi.mock('@/services/billing', () => ({
  billingService: {
    overdue: vi.fn(), remind: vi.fn(), addNote: vi.fn(), statementLink: vi.fn(),
    markLate: vi.fn(), startReview: vi.fn(), endReview: vi.fn(), noticeLink: vi.fn(), adjust: vi.fn(),
  },
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
const prompt = vi.hoisted(() => ({ confirm: vi.fn(), reason: vi.fn() }))
vi.mock('@/composables/usePrompt', () => ({ usePrompt: () => prompt }))

const page = () => document.body
const text = () => page().textContent ?? ''
const buttons = () => [...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

const kim: OverdueRow = {
  payer: { id: 5, name: 'Kim Santos', phone: '0917 000 0001' },
  room_label: '203',
  overdue_centavos: 360000,
  owed_centavos: 540000,
  overdue_bills: 2,
  oldest_due_on: '2026-09-25',
  days_overdue: 35,
  is_late: true,
  under_review_bills: 1,
  last_reminded_on: '2026-10-28',
  latest_note: { id: 1, note: 'Visited. Salary comes Friday.', promised_on: '2026-11-01', by: 'Carla', at: null },
}

const property = (abilities: string[]) => ({ id: 3, name: 'Santos House', abilities }) as unknown as Property

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  document.body.innerHTML = ''
})

describe('OverdueList', () => {
  beforeEach(() => {
    vi.mocked(billingService.overdue).mockResolvedValue({ items: [kim], meta: { payers: 1, overdue_total_centavos: 360000 } })
  })

  test('shows who is behind, how long, the late mark, the last reminder and the latest remark', async () => {
    mount(OverdueList, { props: { property: property(['view_arrears', 'send_reminders']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    const t = text()
    expect(t).toContain('Kim Santos · ₱3,600.00')
    expect(t).toContain('Room 203 · 35 days overdue · 0917 000 0001')
    expect(t).toContain('2 overdue bills since Sep 25')
    expect(t).toContain('₱5,400.00 owed in all')
    expect(t).toContain('Late')
    expect(t).toContain('1 under review')
    expect(t).toContain('Last reminded Oct 28')
    expect(t).toContain('“Visited. Salary comes Friday.” · promised Nov 1')
  })

  test('reminds now, and hands "Record payment" to the parent for that payer', async () => {
    vi.mocked(billingService.remind).mockResolvedValue('Reminder sent to Kim Santos (2 bills).')
    const wrapper = mount(OverdueList, { props: { property: property(['view_arrears', 'send_reminders']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    await press('Remind now')
    expect(billingService.remind).toHaveBeenCalledWith(3, 5)
    expect(toast.success).toHaveBeenCalledWith('Reminder sent to Kim Santos (2 bills).')

    await press('Record payment')
    expect(wrapper.emitted('record')?.[0]).toEqual([5])
  })

  test('hides "Remind now" without the permission', async () => {
    mount(OverdueList, { props: { property: property(['view_arrears']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(buttons()).not.toContain('Remind now')
    expect(buttons()).toContain('Add remark')
  })
})

describe('BillModal follow-up', () => {
  const overdue = {
    id: 21, number: 'BILL-2026-000012', kind: 'periodic', kind_label: 'Monthly bill', property_id: 3,
    payer: { id: 5, name: 'Kim Santos' }, room_label: '203', tenancy_id: 8,
    period_start_on: null, period_end_on: null, issued_on: '2026-10-25', due_on: '2026-10-25',
    total_centavos: 180000, balance_centavos: 180000, status: 'unpaid', is_overdue: true,
    is_late: false, late_notice_number: null, under_review: null, lines: [],
  } as unknown as Bill

  function open(bill: Bill, abilities: { canReview?: boolean; canMarkLate?: boolean } = {}) {
    const wrapper = mount(BillModal, { props: { bill: null, canCorrect: false, ...abilities }, global: { plugins: [IonicVue] }, attachTo: document.body })
    return wrapper.setProps({ bill }).then(flushPromises).then(() => wrapper)
  }

  test('marks an overdue bill late after asking', async () => {
    vi.mocked(billingService.markLate).mockResolvedValue({ bill: { ...overdue, is_late: true, late_notice_number: 'NTC-2026-000001' }, message: 'Marked late.' })
    prompt.confirm.mockResolvedValue(true)
    const wrapper = await open(overdue, { canMarkLate: true })

    await press('Mark late now')
    expect(billingService.markLate).toHaveBeenCalledWith(21)
    expect(wrapper.emitted('changed')?.[0][1]).toBe('Marked late.')
  })

  test('the owner puts a bill under review with a reason; under review, it cannot be marked late', async () => {
    vi.mocked(billingService.startReview).mockResolvedValue({ bill: overdue, message: 'Bill is under review.' })
    prompt.reason.mockResolvedValue('Says she paid by GCash')
    await open(overdue, { canReview: true, canMarkLate: true })

    await press('Put under review')
    expect(billingService.startReview).toHaveBeenCalledWith(21, 'Says she paid by GCash')

    document.body.innerHTML = ''
    await open({ ...overdue, under_review: { since: '2026-10-28T10:00:00+08:00', reason: 'Says she paid by GCash', by: 'Ana' } }, { canReview: true, canMarkLate: true })
    expect(text()).toContain('Under review since Oct 28 (Ana): Says she paid by GCash.')
    expect(buttons()).toContain('End review')
    expect(buttons()).not.toContain('Mark late now')
  })

  test('a late bill shows its notice; a Collector sees no review buttons', async () => {
    await open({ ...overdue, is_late: true, late_notice_number: 'NTC-2026-000001' }, { canMarkLate: true })

    expect(text()).toContain('Late · NTC-2026-000001')
    expect(buttons()).toContain('Late notice (PDF)')
    expect(buttons()).not.toContain('Put under review')
    expect(buttons()).not.toContain('Mark late now')
  })
})
