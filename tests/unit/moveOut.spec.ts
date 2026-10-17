import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import TenantsSection from '@/components/property/TenantsSection.vue'
import SettlementModal from '@/components/tenancy/SettlementModal.vue'
import TenancyModal from '@/components/tenancy/TenancyModal.vue'
import { planSettlement } from '@/lib/settlement'
import { tenancyService } from '@/services/tenancies'
import type { Property } from '@/types/property'
import type { SettlementResult, SettlementWorksheet, Tenancy, TenancyNotice } from '@/types/tenancy'

vi.mock('@/services/tenancies', () => ({
  tenancyService: {
    list: vi.fn(), pendingNotices: vi.fn(), approveNotice: vi.fn(), declineNotice: vi.fn(),
    get: vi.fn(), discounts: vi.fn(), settlement: vi.fn(), settle: vi.fn(), settlementSummaryLink: vi.fn(),
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

async function type(label: string, value: string, nth = 0) {
  const input = [...page().querySelectorAll('ion-input')].filter((i) => i.querySelector('.label-text')?.textContent === label)[nth]?.querySelector('input')
  if (!input) throw new Error(`No input "${label}" (#${nth})`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

const kim = {
  id: 8,
  status: 'active',
  status_label: 'Active',
  property: { id: 3, name: 'Santos House' },
  room: { id: 9, code: 'F2-03', door_no: '203', label: '203', rental_mode: 'bedspaces', let_whole: false },
  unit: { id: 11, label: 'Bed 1', kind: 'bedspace' },
  tenant: { id: 5, name: 'Kim Santos', phone: '0917 000 0001', photo_url: null },
  moved_in_on: '2026-09-25',
  first_day_on: '2026-09-26',
  anchor_day: 25,
  next_rent_due_on: '2026-11-25',
  rent_centavos: 400000,
  discount: null,
  rent_after_discount_centavos: 400000,
  scheduled_discount: null,
  emergency_contact: { name: 'Marta Santos', relationship: 'Mother', phone: '0917 555 0000' },
  house_rules_accepted_at: null,
  created_at: '2026-09-25T10:00:00+08:00',
  end_on: null,
  is_overstaying: false,
  moved_out_on: null,
  pending_notice: null,
  payments: [],
} as unknown as Tenancy

const property = (abilities: string[]) => ({ id: 3, name: 'Santos House', abilities, rooms: [] }) as unknown as Property

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(tenancyService.discounts).mockResolvedValue([])
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('planSettlement (C8 worked examples)', () => {
  test('SC-17, apply the deposit: rent ₱4,000 + water ₱100 unpaid, ₱300 damage: she pays ₱400 more, refund ₱0', () => {
    expect(planSettlement(400000, 410000, 0, 30000, 0)).toEqual({ apply: 400000, left: 0, refund: 0, stillOwed: 40000, creditReturned: 0 })
  })

  test('SC-17, keep for refund: rent already paid, water ₱100 + damage ₱300: refund ₱3,600', () => {
    expect(planSettlement(400000, 10000, 0, 30000, 0)).toEqual({ apply: 40000, left: 360000, refund: 360000, stillOwed: 0, creditReturned: 0 })
  })

  test('keeps part of what is left, and returns unused credit with the refund', () => {
    expect(planSettlement(400000, 0, 50000, 0, 100000)).toEqual({ apply: 0, left: 400000, refund: 350000, stillOwed: 0, creditReturned: 50000 })
  })
})

describe('TenantsSection notices', () => {
  const notice = {
    id: 70, end_on: '2026-11-10', status: 'pending', status_label: 'Waiting for approval', is_short_notice: true,
    reason: null, filed_by: 'Kim Santos', filed_at: null, decided_by: null, decided_at: null, decline_reason: null,
    tenancy: { id: 8, tenant: { id: 5, name: 'Kim Santos', phone: null }, room_label: '203', unit_label: 'Bed 1' },
  } as TenancyNotice

  beforeEach(() => {
    vi.mocked(tenancyService.list).mockResolvedValue({ items: [{ ...kim, status: 'notice_given', end_on: '2026-11-10' }], meta: { current_page: 1, last_page: 1, total: 1 } })
    vi.mocked(tenancyService.pendingNotices).mockResolvedValue([notice])
  })

  test('shows notices to approve with the short-notice flag, and approves one', async () => {
    vi.mocked(tenancyService.approveNotice).mockResolvedValue({ state: {} as never, message: 'Notice approved. Last day: Nov 10, 2026.' })
    prompt.confirm.mockResolvedValue(true)
    mount(TenantsSection, { props: { property: property(['view', 'approve_move_out']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(text()).toContain('Notices to approve (1)')
    expect(text()).toContain('Short notice')
    expect(text()).toContain('Leaving · last day Nov 10')
    await press('Approve')
    expect(tenancyService.approveNotice).toHaveBeenCalledWith(8)
    expect(toast.success).toHaveBeenCalledWith('Notice approved. Last day: Nov 10, 2026.')
  })

  test('does not ask for notices without the permission', async () => {
    mount(TenantsSection, { props: { property: property(['view']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(tenancyService.pendingNotices).not.toHaveBeenCalled()
    expect(text()).not.toContain('Notices to approve')
  })
})

describe('TenancyModal end of stay', () => {
  async function open(t: Tenancy, abilities: { canApproveMoveOut?: boolean; canSettle?: boolean }) {
    vi.mocked(tenancyService.get).mockResolvedValue(t)
    const wrapper = mount(TenancyModal, { props: { tenancyId: null, canManage: false, ...abilities }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.setProps({ tenancyId: t.id })
    await flushPromises()
    return wrapper
  }

  test('offers the right actions for each stage', async () => {
    await open(kim, { canApproveMoveOut: true })
    expect(text()).toContain('Month to month, no end date.')
    expect(buttons()).toEqual(expect.arrayContaining(['Set an end date', 'Left without notice']))
    document.body.innerHTML = ''

    await open({ ...kim, status: 'notice_given', end_on: '2026-11-10', is_overstaying: true } as Tenancy, { canApproveMoveOut: true })
    expect(text()).toContain('Past the last day')
    expect(buttons()).toEqual(expect.arrayContaining(['Record move-out', 'Change end date', 'Cancel end date']))
    document.body.innerHTML = ''

    await open({ ...kim, status: 'ended', end_on: '2026-11-10', moved_out_on: '2026-11-10' } as Tenancy, { canApproveMoveOut: true, canSettle: false })
    expect(text()).toContain('The owner or a Manager settles the deposit.')
    expect(buttons()).not.toContain('Settle the deposit')
  })
})

describe('SettlementModal', () => {
  const ended = { ...kim, status: 'ended', end_on: '2026-11-25', moved_out_on: '2026-11-25' } as Tenancy
  const sheet: SettlementWorksheet = {
    settled: false, deposit_held_centavos: 400000, owed_centavos: 10000, credit_centavos: 0,
    suggested_apply_centavos: 10000, suggested_refund_centavos: 390000, still_owed_centavos: 0,
    rent_now_centavos: 450000, deposit_gap_centavos: 50000,
    unpaid_bills: [{ id: 1, number: 'BILL-2026-000031', kind_label: 'Final bill', due_on: '2026-11-25', balance_centavos: 10000 }],
  }

  async function open(): Promise<VueWrapper> {
    const wrapper = mount(SettlementModal, { props: { open: false, tenancy: ended, canSettle: true }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await flushPromises()
    return wrapper
  }

  test('previews the refund as deductions are added, and settles', async () => {
    vi.mocked(tenancyService.settlement).mockResolvedValue(sheet)
    vi.mocked(tenancyService.settle).mockResolvedValue({ result: {} as SettlementResult, message: 'Deposit settled.' })
    prompt.confirm.mockResolvedValue(true)
    const wrapper = await open()

    expect(text()).toContain('₱500.00 more than the deposit') // SC-18
    expect(text()).toContain('₱3,900.00')
    await press('Add a deduction')
    await type('What for', 'Broken chair')
    await type('Amount (₱)', '300')
    await type('Reason', 'Found at move-out')
    expect(text()).toContain('₱3,600.00')

    await press('Settle the deposit')
    expect(tenancyService.settle).toHaveBeenCalledWith(8, expect.objectContaining({
      deductions: [{ description: 'Broken chair', amount_centavos: 30000, reason: 'Found at move-out' }],
      refund_method: 'cash',
    }))
    expect(wrapper.emitted('settled')?.[0]).toEqual(['Deposit settled.'])
  })

  test('asks for a reason before keeping part of the deposit', async () => {
    vi.mocked(tenancyService.settlement).mockResolvedValue(sheet)
    await open()

    await type('Amount kept (₱)', '500')
    await press('Settle the deposit')
    expect(toast.error).toHaveBeenCalledWith('Say why you keep part of the deposit.')
    expect(tenancyService.settle).not.toHaveBeenCalled()
  })

  test('shows a settled result with the summary button', async () => {
    vi.mocked(tenancyService.settlement).mockResolvedValue({
      settled: true, id: 2, deposit_held_centavos: 400000, deductions: [], deductions_centavos: 0, applied_centavos: 10000,
      kept_centavos: 0, kept_reason: null, refund_centavos: 390000, credit_returned_centavos: 0, still_owed_centavos: 0,
      refund_method: 'cash', refund_method_label: 'Cash', refund_reference: null, refunded_on: '2026-11-27', note: null,
      settled_by: 'Ana Santos', settled_at: null,
    })
    await open()

    expect(text()).toContain('Refunded')
    expect(text()).toContain('₱3,900.00')
    expect(text()).toContain('Settled by Ana Santos.')
    expect(buttons()).toContain('Settlement summary (PDF)')
  })
})
