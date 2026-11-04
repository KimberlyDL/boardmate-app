import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { AxiosError, AxiosHeaders } from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import CollectionsPage from '@/views/account/CollectionsPage.vue'
import { financeService } from '@/services/finance'
import type { CollectionsSummary } from '@/types/finance'

vi.mock('@/services/finance', () => ({ financeService: { collections: vi.fn() } }))
vi.mock('@/components/dl/DlChart.vue', () => ({ default: { props: ['label', 'labels'], template: '<div class="chart" :data-label="label" :data-labels="labels.join(\'|\')" />' } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

const summary = (over: Partial<CollectionsSummary> = {}): CollectionsSummary => ({
  properties: [{ id: 3, name: 'Santos House' }],
  week: { from: '2026-10-29', to: '2026-11-04' },
  received: {
    payments: 2,
    centavos: 80000,
    by_day: ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']
      .map((date) => ({ date, payments: 0, centavos: 0 })),
  },
  due_soon: { bills: 1, centavos: 200000 },
  overdue: { payers: 2, bills: 3, centavos: 450000, late_payers: 1, under_review_bills: 0 },
  behind: { days_1_30: { payers: 1, centavos: 90000 }, days_31_60: { payers: 0, centavos: 0 }, days_61_90: { payers: 1, centavos: 360000 }, over_90: { payers: 0, centavos: 0 } },
  proofs_waiting: 1,
  most_behind: [{
    property: { id: 3, name: 'Santos House' }, payer: { id: 7, name: 'Kim', phone: null }, room_label: 'Room 201',
    overdue_centavos: 360000, days_overdue: 71, is_late: true, promised_on: '2026-11-06',
  }],
  ...over,
})

const text = () => document.body.textContent ?? ''
async function mountPage() {
  mount(CollectionsPage, { global: { plugins: [IonicVue] }, attachTo: document.body })
  await flushPromises()
}

describe('Collections screen (Collectors included)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('shows what came in, what is due and who is behind, without income or costs', async () => {
    vi.mocked(financeService.collections).mockResolvedValue(summary())
    await mountPage()

    expect(text()).toContain('₱800')                      // received in 7 days
    expect(text()).toContain('2 payments')
    expect(text()).toContain('₱2k')                       // due in 7 days
    expect(text()).toContain('2 people · 1 marked late')
    expect(text()).toContain('Proofs to check')
    expect(text()).toContain('Room 201 · promised 6 Nov')
    expect(text()).not.toContain('Billed')
    expect(text()).not.toContain('Deposits')
    const charts = [...document.querySelectorAll('.chart')]
    expect(charts[0].getAttribute('data-labels')?.split('|')[0]).toBe('Thu 29')
    expect(charts[1].getAttribute('data-labels')).toBe('1–30 days (1)|31–60 days (0)|61–90 days (1)|Over 90 days (0)')  })

  test('hides proofs for someone who may not confirm them, and says when nobody is behind', async () => {
    vi.mocked(financeService.collections).mockResolvedValue(summary({
      proofs_waiting: null,
      overdue: { payers: 0, bills: 0, centavos: 0, late_payers: 0, under_review_bills: 0 },
      most_behind: [],
    }))
    await mountPage()

    expect(text()).not.toContain('Proofs to check')
    expect(text()).toContain('Nobody is behind')
    expect(document.querySelectorAll('.chart')).toHaveLength(1)
  })

  test('tells a boarder this is not for them', async () => {
    vi.mocked(financeService.collections).mockRejectedValue(
      new AxiosError('Forbidden', '403', undefined, undefined, { status: 403, statusText: 'Forbidden', headers: {}, config: { headers: new AxiosHeaders() }, data: {} }),
    )
    await mountPage()

    expect(text()).toContain('Nothing to collect here')
    expect(toast.error).not.toHaveBeenCalled()
  })
})
