import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import TenantsSection from '@/components/property/TenantsSection.vue'
import MyStayPage from '@/views/boarder/MyStayPage.vue'
import { tenancyService } from '@/services/tenancies'
import type { Property } from '@/types/property'
import type { Tenancy } from '@/types/tenancy'

vi.mock('@/services/tenancies', () => ({ tenancyService: { list: vi.fn(), mine: vi.fn(), get: vi.fn(), discounts: vi.fn(), preview: vi.fn() } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
// Entering a tab is the router's job; run the callback straight away.
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), onIonViewWillEnter: (cb: () => void) => cb() }))

const page = () => document.body
const text = () => page().textContent ?? ''

const kim = {
  id: 1,
  status: 'active',
  property: { id: 3, name: 'Santos House' },
  room: { id: 9, code: 'B1-F2-03', rental_mode: 'whole' },
  unit: { id: 11, label: 'Whole house', kind: 'whole' },
  tenant: { id: 5, name: 'Kim Santos', phone: '0917 000 0001', photo_url: null, email: 'kim@example.com' },
  moved_in_on: '2026-10-25',
  first_day_on: '2026-10-26',
  anchor_day: 25,
  next_rent_due_on: '2026-11-25',
  rent_centavos: 450000,
  discount: { label: 'Agreed rate', kind: 'fixed', value: 50000, amount_centavos: 50000, effective_from: '2026-10-25' },
  rent_after_discount_centavos: 400000,
  scheduled_discount: null,
  emergency_contact: { name: 'Marta Santos', relationship: 'Mother', phone: '0917 555 0000' },
  activation_override: null,
} as unknown as Tenancy

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  document.body.innerHTML = ''
})

function property(abilities: string[], statuses: string[]): Property {
  return {
    id: 3,
    name: 'Santos House',
    abilities,
    rooms: [
      {
        id: 9, code: '01', units: statuses.map((status, i) => ({ id: 10 + i, label: `Bed ${i + 1}`, kind: 'bedspace', status, not_ready: false, rent_centavos: 200000 })),
      },
    ],
  } as unknown as Property
}

describe('TenantsSection', () => {
  beforeEach(() => {
    vi.mocked(tenancyService.list).mockResolvedValue({ items: [kim], meta: { current_page: 1, last_page: 1, total: 1 } as never })
  })

  test('lists who lives here with their next rent and agreed rate', async () => {
    mount(TenantsSection, { props: { property: property(['view', 'manage_tenancies'], ['available']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(tenancyService.list).toHaveBeenCalledWith(3, undefined, 1)
    expect(text()).toContain('Room B1-F2-03 · Whole house')
    expect(text()).toContain('Kim Santos')
    expect(text()).toContain('next rent Nov 25')
    expect(text()).toContain('₱4,000.00 / month')
    expect(text()).toContain('Agreed rate')
  })

  test('the walk-in button needs the permission and a unit that is free', async () => {
    const withUnit = mount(TenantsSection, { props: { property: property(['view', 'manage_tenancies'], ['available', 'occupied']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()
    const walkIn = () => [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === 'Move in a walk-in') as HTMLElement | undefined
    expect(walkIn()).toBeTruthy()
    expect(walkIn()!.hasAttribute('disabled') || walkIn()!.getAttribute('aria-disabled') === 'true').toBe(false)
    withUnit.unmount()
    document.body.innerHTML = ''

    mount(TenantsSection, { props: { property: property(['view', 'manage_tenancies'], ['occupied', 'reserved']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()
    expect(text()).toContain('No unit is free to rent right now.')

    document.body.innerHTML = ''
    mount(TenantsSection, { props: { property: property(['view'], ['available']) }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()
    expect(walkIn()).toBeUndefined() // a Collector can look but not move people in
  })
})

describe('MyStayPage', () => {
  // The back button needs the router, which these tests do not run.
  const mountStay = () => mount(MyStayPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true } }, attachTo: document.body })

  test('says so when nobody has moved the boarder in', async () => {
    vi.mocked(tenancyService.mine).mockResolvedValue([])
    mountStay()
    await flushPromises()

    expect(text()).toContain('You are not moved in anywhere yet.')
  })

  test('shows the stay, what they pay and when, and the leader role with who stays', async () => {
    vi.mocked(tenancyService.mine).mockResolvedValue([{ ...kim, is_leader: true }])
    mountStay()
    await flushPromises()

    const t = text()
    expect(t).toContain('Santos House')
    expect(t).toContain('Room B1-F2-03 · Whole house')
    expect(t).toContain('due every month on the 25')
    expect(t).toContain('Nov 25, 2026')
    expect(t).toContain('₱4,000.00 / month')
    expect(t).toContain('agreed rate: ₱500.00 off ₱4,500.00')
    expect(t).toContain('Utilities are billed after each month')
    expect(t).toContain('You are the leader of this room.')
    expect(t).toContain('Marta Santos')
    expect([...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())).toContain('Who stays in the room')
  })

  test('a member who is not the leader sees no leader card', async () => {
    vi.mocked(tenancyService.mine).mockResolvedValue([{ ...kim, is_leader: false }])
    mountStay()
    await flushPromises()

    expect(text()).not.toContain('You are the leader of this room.')
  })

  test('a leader of a bedspace room has no list of occupants to manage', async () => {
    vi.mocked(tenancyService.mine).mockResolvedValue([{ ...kim, is_leader: true, room: { ...kim.room, rental_mode: 'bedspaces' } }])
    mountStay()
    await flushPromises()

    expect(text()).toContain('You are the leader of this room.')
    expect([...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())).not.toContain('Who stays in the room')
  })
})
