import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import BoarderHomePage from '@/views/boarder/BoarderHomePage.vue'
import { bookingService } from '@/services/bookings'
import { dashboardService } from '@/services/dashboard'
import type { TenantHome } from '@/types/dashboard'

vi.mock('@/services/dashboard', () => ({ dashboardService: { home: vi.fn() } }))
vi.mock('@/services/bookings', () => ({ bookingService: { mine: vi.fn() } }))
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

const text = () => document.body.textContent ?? ''

const staying: TenantHome = {
  stay: { id: 8, property: { id: 3, name: 'Santos House' }, room_label: '203', unit_label: 'Bed 1', emergency_numbers: 'Barangay 8123 4567', leaving: { end_on: '2026-11-30', approved: false } },
  money: { owed_centavos: 250000, credit_centavos: 0, overdue_centavos: 50000, next_bill: { id: 1, number: 'BILL-2026-000001', due_on: '2026-10-15', balance_centavos: 50000 } },
  requests: { repairs_open: 1, repairs_to_confirm: 1, late_entries_waiting: 0, visitors_waiting: 1 },
  group: { id: 4, owe_centavos: 0, owed_to_me_centavos: 30000, is_leader: true, members_owing_me: [{ name: 'Ben', amount_centavos: 30000 }] },
  house_rules_to_accept: true,
  unread_notifications: 2,
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('BoarderHomePage', () => {
  test('shows what needs the tenant, their money, room group and emergency numbers', async () => {
    vi.mocked(dashboardService.home).mockResolvedValue(staying)
    mount(BoarderHomePage, { global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    const needs = [...document.querySelectorAll('.needs ion-item')].map((i) => i.textContent?.trim())
    expect(needs).toEqual(['₱500.00 overdue', 'New house rules to accept', 'Is it fixed? 1 repair to confirm', '1 request waiting for the owner', '1 repair in progress'])
    expect(text()).toContain('You owe ₱2,500.00')
    expect(text()).toContain('Last day Nov 30, 2026 (waiting for approval)')
    expect(text()).toContain('Ben: ₱300.00')
    expect(text()).toContain('Barangay 8123 4567')
    expect(text()).toContain('2 new messages')
    expect(bookingService.mine).not.toHaveBeenCalled()
  })

  test('without a stay, offers the reservation or the finder', async () => {
    vi.mocked(dashboardService.home).mockResolvedValue({ stay: null, money: null, requests: null, group: null, house_rules_to_accept: false, unread_notifications: 0 })
    vi.mocked(bookingService.mine).mockResolvedValue({ items: [{ status: 'pending' } as never], reservationId: null })
    mount(BoarderHomePage, { global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(text()).toContain('Find a place to stay')
    expect(text()).toContain('You have 1 application waiting.')
  })
})
