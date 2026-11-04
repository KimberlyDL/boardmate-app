import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import MySpendingPage from '@/views/boarder/MySpendingPage.vue'
import { dashboardService } from '@/services/dashboard'
import type { TenantSpending } from '@/types/dashboard'

vi.mock('@/services/dashboard', () => ({ dashboardService: { spending: vi.fn() } }))
vi.mock('@/components/dl/DlChart.vue', () => ({ default: { props: ['label', 'labels'], template: '<div class="chart" :data-label="label" :data-labels="labels.join(\'|\')" />' } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

const months = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
const spending = (over: Partial<TenantSpending> = {}): TenantSpending => ({
  period: { from: '2025-12-01', to: '2026-11-30' },
  months: months.map((month) => ({ month, rent: 0, utilities: 0, other: 0, paid: 0, group: 0 })),
  totals: { rent: 400000, utilities: 70000, other: 40000, billed: 510000, paid: 430000, group: 50000 },
  deposits: { paid: 400000, held: 400000, refunded: 0, kept: 0 },
  ...over,
})

const text = () => document.body.textContent ?? ''
async function mountPage() {
  mount(MySpendingPage, { global: { plugins: [IonicVue] }, attachTo: document.body })
  await flushPromises()
}

describe('My spending (boarder)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('shows what I paid and was billed, my room group share and my deposit', async () => {
    vi.mocked(dashboardService.spending).mockResolvedValue(spending())
    await mountPage()

    expect(text()).toContain('1 Dec 2025 – 30 Nov 2026')
    expect(text()).toContain('₱4.3k')    // paid
    expect(text()).toContain('₱5.1k')    // billed
    expect(text()).toContain('₱500')     // room group
    expect(text()).toContain('Returned when you move out')
    expect(text()).toContain('₱5,600.00 in 12 months')   // billed + room group
    const charts = [...document.querySelectorAll('.chart')]
    expect(charts.map((c) => c.getAttribute('data-label'))).toEqual([
      "What you were billed each month, by kind, with your room group share",
      'Where your money went in the last 12 months',
      'What you paid the owner each month',
    ])
    expect(charts[1].getAttribute('data-labels')).toBe('Rent|Utilities|Other charges|Room group')
  })

  test('shows a settled deposit as refunded', async () => {
    vi.mocked(dashboardService.spending).mockResolvedValue(spending({ deposits: { paid: 400000, held: 0, refunded: 350000, kept: 50000 } }))
    await mountPage()

    expect(text()).toContain('₱3.5k refunded')
    expect(text()).toContain('Kept by the owner')
  })

  test('says when there is nothing yet', async () => {
    vi.mocked(dashboardService.spending).mockResolvedValue(spending({
      totals: { rent: 0, utilities: 0, other: 0, billed: 0, paid: 0, group: 0 },
      deposits: { paid: 0, held: 0, refunded: 0, kept: 0 },
    }))
    await mountPage()

    expect(text()).toContain('Your spending shows here once you move in')
    expect(document.querySelectorAll('.chart')).toHaveLength(0)
  })
})
