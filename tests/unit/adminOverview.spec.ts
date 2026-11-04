import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import AdminOverviewPage from '@/views/admin/AdminOverviewPage.vue'
import { adminService } from '@/services/admin'
import type { PlatformStats } from '@/types/dashboard'

vi.mock('@/services/admin', () => ({ adminService: { stats: vi.fn() } }))
vi.mock('@/components/NotificationBell.vue', () => ({ default: { template: '<span />' } }))
vi.mock('@/components/dl/DlChart.vue', () => ({ default: { props: ['label', 'labels'], template: '<div class="chart" :data-label="label" :data-labels="labels.join(\'|\')" />' } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

const months = ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
const stats = (over: Partial<PlatformStats> = {}): PlatformStats => ({
  accounts: { total: 1240, new_this_month: 38, suspended: 2, boarders: 1240, owners: 25, caretakers: 9 },
  owners: { pending: 3, verified: 20, rejected: 2, suspended: 0 },
  listings: { on_finder: 18, with_free_places: 12, not_published: 4, places: 160, free_places: 41 },
  stays: { current: 96, applications_waiting: 7 },
  campuses: 3,
  months: months.map((month, i) => ({ month, sign_ups: i, applications: i * 2, approved: i, move_ins: i })),
  ...over,
})

const text = () => document.body.textContent ?? ''

describe('Admin overview (counts only)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })
  afterEach(() => {
    document.body.innerHTML = ''
  })

  test('shows accounts, owners to review, listings and stays, with monthly charts', async () => {
    vi.mocked(adminService.stats).mockResolvedValue(stats())
    mount(AdminOverviewPage, { global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(text()).toContain('1,240')
    expect(text()).toContain('+38 this month')
    expect(text()).toContain('20 verified')
    expect(text()).toContain('41 of 160 places free')
    expect(text()).toContain('7 applications waiting')
    expect(text()).not.toContain('₱')
    const charts = [...document.querySelectorAll('.chart')]
    expect(charts).toHaveLength(3)
    expect(charts[2].getAttribute('data-labels')).toBe('Verified|Waiting for review|Rejected')   // empty statuses left out
  })
})
