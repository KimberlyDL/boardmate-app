import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { AxiosError, AxiosHeaders } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { manilaDate } from '@/lib/dayjs'
import { ageingRows, billedSlices, change, occupancySummary, periodDates, periodFromQuery, periodText, periodToQuery, presetRange, rateChange } from '@/lib/insights'
import InsightsPage from '@/views/account/InsightsPage.vue'
import PropertyInsightsPage from '@/views/account/PropertyInsightsPage.vue'
import RoomInsightsPage from '@/views/account/RoomInsightsPage.vue'
import StayInsightsPage from '@/views/account/StayInsightsPage.vue'
import { financeService } from '@/services/finance'
import type { FinanceFigures, PortfolioFinance, PropertyFinance, RoomFinance, StayFinance } from '@/types/finance'

vi.mock('@/services/finance', () => ({
  financeService: { portfolio: vi.fn(), portfolioPdf: vi.fn(), property: vi.fn(), room: vi.fn(), stay: vi.fn(), stayPdf: vi.fn() },
}))
const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), route: { params: {} as Record<string, string>, query: {} as Record<string, string> } }))
vi.mock('vue-router', async (original) => ({
  ...(await original<typeof import('vue-router')>()),
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  useRoute: () => nav.route,
}))
vi.mock('@/components/dl/DlChart.vue', () => ({ default: { props: ['label'], template: '<div class="chart" :data-label="label" />' } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
const opened = vi.hoisted(() => ({ openDocument: vi.fn(async (get: () => Promise<unknown>) => void (await get())) }))
vi.mock('@/lib/documents', () => opened)
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

describe('insights helpers', () => {
  const today = manilaDate('2026-11-04')

  test('sums up places taken: the latest month with places and the average', () => {
    const series = [
      { month: '2026-09', places: 0, occupied: 0, rate: null },
      { month: '2026-10', places: 2, occupied: 2, rate: 1 },
      { month: '2026-11', places: 4, occupied: 2, rate: 0.5 },
    ]
    expect(occupancySummary(series)).toEqual({ latest: series[2], average: 0.75 })
    expect(occupancySummary([series[0]])).toBeNull()
  })

  test('turns presets into whole months', () => {
    expect(presetRange('this_month', today)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(presetRange('last_month', today)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(presetRange('last_3', today)).toEqual({ from: '2026-09-01', to: '2026-11-30' })
    expect(presetRange('last_12', today)).toEqual({ from: '2025-12-01', to: '2026-11-30' })
    expect(presetRange('custom', today)).toBeNull()
  })

  test('writes periods briefly', () => {
    expect(periodText({ from: '2026-10-01', to: '2026-10-31' })).toBe('1–31 Oct 2026')
    expect(periodText({ from: '2026-09-01', to: '2026-10-31' })).toBe('1 Sep – 31 Oct 2026')
    expect(periodText({ from: '2025-12-01', to: '2026-01-31' })).toBe('1 Dec 2025 – 31 Jan 2026')
    expect(periodText({ from: '2026-10-20', to: '2026-10-20' })).toBe('20 Oct 2026')
  })

  test('compares with the period before', () => {
    expect(change(112000, 100000)).toEqual({ text: '+12%', direction: 'up' })
    expect(change(95000, 100000)).toEqual({ text: '−5%', direction: 'down' })
    expect(change(500, 0)).toEqual({ text: 'new', direction: 'up' })
    expect(change(0, 0)).toBeNull()
    expect(change(100000, 100000)).toEqual({ text: 'same', direction: 'same' })
    expect(rateChange(0.78, 0.75)).toEqual({ text: '+3 pts', direction: 'up' })
    expect(rateChange(0.75, null)).toBeNull()
  })

  test('carries the period in links and reads it back', () => {
    expect(periodToQuery({ preset: 'this_month', from: '', to: '' })).toEqual({})
    expect(periodToQuery({ preset: 'last_3', from: '', to: '' })).toEqual({ period: 'last_3' })
    expect(periodToQuery({ preset: 'custom', from: '2026-10-05', to: '2026-10-18' })).toEqual({ from: '2026-10-05', to: '2026-10-18' })
    expect(periodFromQuery({ period: 'last_12' })).toEqual({ preset: 'last_12', from: '', to: '' })
    expect(periodFromQuery({ from: '2026-10-05', to: '2026-10-18' })).toEqual({ preset: 'custom', from: '2026-10-05', to: '2026-10-18' })
    expect(periodFromQuery({ from: '2026-10-18', to: '2026-10-05' }).preset).toBe('this_month')   // backwards dates are ignored
    expect(periodFromQuery({ period: 'nonsense' }).preset).toBe('this_month')
    expect(periodDates({ preset: 'custom', from: '', to: '' })).toBeNull()
  })

  test('lists unpaid by age and billed kinds, leaving out empty kinds', () => {
    expect(ageingRows({ not_due: 1, days_1_30: 2, days_31_60: 3, days_61_90: 4, over_90: 5 }).map((r) => r.centavos)).toEqual([1, 2, 3, 4, 5])
    expect(billedSlices({ rent: 400000, fixed_utilities: 30000, utility_shares: 0, charges: 50000, corrections: -10000, total: 470000 }).map((s) => s.label))
      .toEqual(['Rent', 'Fixed utilities', 'One-time charges'])
  })
})

const figures = (over: Partial<FinanceFigures> = {}): FinanceFigures => ({
  billed: { rent: 400000, fixed_utilities: 30000, utility_shares: 40000, charges: 50000, corrections: -10000, total: 510000 },
  collected: { payments: 200000, first_rent: 200000, total: 400000, unapplied: 0 },
  paid_from_deposit: 30000,
  collection: { due: 320000, paid: 240000, rate: 0.75 },
  outstanding: { total: 80000, overdue: 80000, under_review: 0, ageing: { not_due: 0, days_1_30: 80000, days_31_60: 0, days_61_90: 0, over_90: 0 } },
  credit_held: 0,
  deposits: { received: 400000, held: 800000, refunded: 250000, kept: 50000 },
  utilities: { billed: 70000, provider_cost: 0, waived: 0 },
  repair_costs: 15000,
  occupancy: { places: 2, occupied: 1 },
  ...over,
})

const portfolio = (): PortfolioFinance => ({
  properties: [{ id: 4, name: 'Annex' }, { id: 3, name: 'Santos House' }],
  period: { from: '2026-11-01', to: '2026-11-30' },
  totals: figures(),
  previous: { period: { from: '2026-10-01', to: '2026-10-31' }, billed: 200000, collected: 200000, collection_rate: null, deposits_received: 400000, utilities_billed: 0, provider_cost: 0, repair_costs: 0 },
  by_property: [
    { property: { id: 4, name: 'Annex' }, ...figures({ collection: { due: 0, paid: 0, rate: null } }) },
    { property: { id: 3, name: 'Santos House' }, ...figures() },
  ],
  series: [{ month: '2026-11', billed: 510000, collected: 400000 }],
  occupancy_series: [
    { month: '2026-10', places: 0, occupied: 0, rate: null },
    { month: '2026-11', places: 2, occupied: 1, rate: 0.5 },
  ],
  house: {
    repairs: { reported: 3, fixed: 1, cancelled: 0, average_days_to_fix: 2.5, open_now: 2, urgent_open_now: 1, by_kind: [{ kind: 'plumbing', label: 'Plumbing', count: 3 }] },
    late_entries: {
      requests: { approved: 2, declined: 1, waiting: 0, cancelled: 0 },
      curfew_violations: 4,
      repeat_count: 3,
      repeated: [{ stay: { id: 21, tenant: 'Ben', room: '2' }, nights: 3 }],
    },
    previous: { repairs_reported: 1, repairs_fixed: 1, late_requests: 0, curfew_violations: 6 },
  },
})

const page = () => document.body
const text = () => page().textContent ?? ''

async function mountPage(component: unknown = InsightsPage) {
  mount(component as typeof InsightsPage, { global: { plugins: [IonicVue] }, attachTo: document.body })
  await flushPromises()
}

const tap = async (selector: string, contains: string) => {
  const el = [...page().querySelectorAll(selector)].find((e) => e.textContent?.includes(contains)) as HTMLElement
  if (!el) throw new Error(`Nothing "${contains}" in ${selector}`)
  el.click()
  await flushPromises()
}

describe('Insights screen', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.mocked(financeService.portfolio).mockResolvedValue(portfolio())
    vi.mocked(financeService.portfolioPdf).mockResolvedValue({ url: 'https://example.test/finance.pdf', expires_in_minutes: 30 })
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('shows the headline figures against the period before, and the charts', async () => {
    await mountPage()

    expect(financeService.portfolio).toHaveBeenCalledWith(expect.objectContaining({ from: expect.any(String), to: expect.any(String) }), null)
    expect(text()).toContain('All properties')
    expect(text()).toContain('₱4k')                // collected
    expect(text()).toContain('+100% vs before')   // ₱4,000 against ₱2,000
    expect(text()).toContain('75%')               // paid on time
    expect(text()).toContain('₱800 overdue')
    expect(text()).toContain('1 of 2 in Nov 2026')   // places taken, latest month
    expect([...page().querySelectorAll('.chart')].map((c) => c.getAttribute('data-label'))).toEqual([
      'Billed and collected each month for the last 12 months',
      'Share of places taken at the end of each month for the last 12 months',
      'Unpaid bills by how many days overdue',
      'What was billed, by kind',
      'Utilities billed to boarders and provider bills',
      'Repairs reported in this period, by kind',
    ])
    expect(text()).toContain('2 open now · 1 urgent')
    expect(text()).toContain('3 (+2)')            // repairs reported vs before
    expect(text()).toContain('2.5 days')
    expect(text()).toContain('4 (−2)')            // late without asking vs before
    expect(text()).toContain('3 nights')
    await tap('.dl-list-row, [role=button], button', 'Ben')
    expect(nav.push).toHaveBeenCalledWith('/insights/stays/21')
  })

  test('lists each property, which opens its rooms with the same period', async () => {
    await mountPage()
    await tap('.dl-chip', '3 months')
    await tap('.dl-list-row', 'Santos House')

    expect(nav.push).toHaveBeenCalledWith({ path: '/insights/properties/3', query: { period: 'last_3' } })
  })

  test('asks for the period picked', async () => {
    await mountPage()
    const chip = [...page().querySelectorAll('.dl-chip')].find((c) => c.textContent?.trim() === '12 months') as HTMLElement
    chip.click()
    await flushPromises()

    const [query] = vi.mocked(financeService.portfolio).mock.lastCall!
    expect(manilaDate(query.to!).diff(manilaDate(query.from!), 'month')).toBe(11)
  })

  test('opens the PDF statement for the same view', async () => {
    await mountPage()
    const button = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.includes('PDF')) as HTMLElement
    button.click()
    await flushPromises()

    expect(financeService.portfolioPdf).toHaveBeenCalledWith(expect.objectContaining({ from: expect.any(String) }), null)
  })

  test('tells a Collector that only the owner and Managers see finances', async () => {
    vi.mocked(financeService.portfolio).mockRejectedValue(
      new AxiosError('Forbidden', '403', undefined, undefined, { status: 403, statusText: 'Forbidden', headers: {}, config: { headers: new AxiosHeaders() }, data: {} }),
    )
    await mountPage()

    expect(text()).toContain('Only the owner and Managers see finances')
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('Insights drill-down', () => {
  const previous = portfolio().previous
  const series = portfolio().series
  const occupancy_series = portfolio().occupancy_series
  const house = portfolio().house

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    nav.route = { params: { id: '3' }, query: { period: 'last_3' } }
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('a property keeps the period from the link and opens a room', async () => {
    const data: PropertyFinance = {
      property: { id: 3, name: 'Santos House' }, period: { from: '2026-09-01', to: '2026-11-30' }, totals: figures(), previous, series, occupancy_series, house,
      rooms: [
        { room: { id: 12, label: 'Room 201', floor: 2 }, ...figures({ collected: { payments: 0, first_rent: 0, total: 150000, unapplied: null } }) },
        { room: null, ...figures() },
      ],
    }
    vi.mocked(financeService.property).mockResolvedValue(data)
    await mountPage(PropertyInsightsPage)

    expect(financeService.property).toHaveBeenCalledWith(3, expect.objectContaining({ from: expect.stringMatching(/-01$/) }))
    expect(text()).toContain('Collected ₱1.5k')
    expect(text()).toContain('Rooms since removed')

    await tap('.dl-list-row', 'Room 201')
    expect(nav.push).toHaveBeenCalledWith({ path: '/insights/rooms/12', query: { period: 'last_3' } })
  })

  test('a room lists its stays with what is still unpaid, and opens one', async () => {
    const data: RoomFinance = {
      property: { id: 3, name: 'Santos House' }, room: { id: 12, label: 'Room 201', floor: 2 },
      period: { from: '2026-09-01', to: '2026-11-30' }, totals: figures({ utilities: { billed: 70000, provider_cost: null, waived: null } }), previous, series, occupancy_series, house,
      stays: [{
        stay: { id: 40, status: 'active', tenant: { id: 7, name: 'Kim' }, unit: { id: 5, label: 'Bed 1' }, moved_in_on: '2026-09-01', moved_out_on: null },
        billed: 510000, paid: 400000, paid_from_deposit: 30000, balance: 80000, overdue: 80000, deposit_received: 400000, deposit_held: 400000,
      }],
    }
    vi.mocked(financeService.room).mockResolvedValue(data)
    await mountPage(RoomInsightsPage)

    expect(text()).toContain('Bed 1 · 1 Sep 2026 – today · paid ₱4k of ₱5.1k')
    expect(text()).toContain('₱800')
    expect(text()).toContain('Billed to the people here')   // no provider bills for one room

    await tap('.dl-list-row', 'Kim')
    expect(nav.push).toHaveBeenCalledWith('/insights/stays/40')
  })

  test('a stay shows its totals, bills, move-in money, payments and the settlement', async () => {
    const data: StayFinance = {
      stay: {
        id: 40, status: 'settled', tenant: { id: 7, name: 'Ana' }, unit: { id: 5, label: 'Bed 2' }, moved_in_on: '2026-06-01', moved_out_on: '2026-09-30',
        property: { id: 3, name: 'Santos House' }, room: { id: 12, label: 'Room 201' },
      },
      totals: { billed: 600000, paid: 600000, paid_from_deposit: 0, balance: 0, overdue: 0, deposit_received: 300000, deposit_held: 0 },
      move_in: [{ kind: 'deposit', kind_label: 'Deposit', amount_centavos: 300000, method: 'cash', method_label: 'Cash', received_on: '2026-06-01', reference: null }],
      bills: [{ id: 1, number: 'BL-2026-000001', kind: 'monthly', kind_label: 'Monthly bill', period_start_on: null, period_end_on: null, issued_on: '2026-07-01', due_on: '2026-07-01', total_centavos: 200000, balance_centavos: 0, overdue: false, under_review: false, late: false }],
      payments: [{ id: 9, receipt_number: 'OR-2026-000009', paid_on: '2026-07-01', method: 'cash', method_label: 'Cash', amount_centavos: 200000, applied_centavos: 200000 }],
      settlement: { id: 2, deposit_held_centavos: 300000, deductions_centavos: 0, applied_centavos: 0, refund_centavos: 250000, kept_centavos: 50000, kept_reason: 'Broken lock', still_owed_centavos: 0, refunded_on: '2026-10-15', settled_on: '2026-10-15' },
    }
    vi.mocked(financeService.stay).mockResolvedValue(data)
    vi.mocked(financeService.stayPdf).mockResolvedValue({ url: 'https://example.test/stay.pdf', expires_in_minutes: 30 })
    await mountPage(StayInsightsPage)

    expect(financeService.stay).toHaveBeenCalledWith(3)
    expect(text()).toContain('Santos House · Room 201 · Bed 2 · 1 Jun 2026 – 30 Sep 2026')
    expect(text()).toContain('Monthly bill · ₱2,000.00')
    expect(text()).toContain('Deposit · ₱3,000.00')
    expect(text()).toContain('OR-2026-000009')
    expect(text()).toContain('Kept because: Broken lock')

    await tap('ion-button', 'PDF')
    expect(financeService.stayPdf).toHaveBeenCalledWith(3)
  })
})
