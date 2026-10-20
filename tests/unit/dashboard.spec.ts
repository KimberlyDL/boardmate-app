import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import PropertyDashboardView from '@/components/dashboard/PropertyDashboardView.vue'
import PropertyGlance from '@/components/dashboard/PropertyGlance.vue'
import { todoItems } from '@/lib/dashboardTodo'
import { dashboardService } from '@/services/dashboard'
import type { PropertyDashboard } from '@/types/dashboard'

vi.mock('@/services/dashboard', () => ({ dashboardService: { property: vi.fn(), mine: vi.fn() } }))

const santos: PropertyDashboard = {
  property: { id: 3, name: 'Santos House' },
  occupancy: { rooms: 2, places: 4, occupied: 3, reserved: 1, available: 0, not_ready: 0 },
  due_this_week: { bills: 2, centavos: 400000 },
  overdue: { payers: 1, centavos: 50000 },
  collected_this_month: 600000,
  applications_waiting: 2,
  proofs_waiting: 1,
  repairs: { open: 3, urgent: 1 },
  house_operations: { visitors_today: 1, overnight_waiting: 1, late_entries_waiting: 0, repeated_late: 1 },
  unpaid_shared_bills: [{ room: { id: 9, label: '203' }, billed_to: 'Kim', centavos: 30000, overdue: true }],
}
const empty: PropertyDashboard = {
  ...santos,
  property: { id: 4, name: 'Annex' },
  occupancy: { rooms: 0, places: 0, occupied: 0, reserved: 0, available: 0, not_ready: 0 },
  collected_this_month: null,
  overdue: null,
  due_this_week: null,
}

const text = () => document.body.textContent ?? ''

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  document.body.innerHTML = ''
})

describe('todoItems', () => {
  test('lists what waits, urgent things first, with links to the right tab', () => {
    const items = todoItems([santos], '/owner/applications')
    expect(items.map((i) => i.text)).toEqual([
      '1 urgent repair',
      '1 boarder overdue · ₱500.00',
      '2 applications to review',
      '1 payment to confirm',
      '1 curfew or visitor request to decide',
      '2 open repairs',
      '1 boarder often back after curfew',
    ])
    expect(items[0]).toMatchObject({ urgent: true, link: '/properties/3?tab=maintenance', detail: 'Santos House' })
    expect(items.find((i) => i.text.includes('applications'))!.link).toBe('/owner/applications')
    expect(todoItems([{ ...santos, repairs: null, overdue: null, applications_waiting: null, proofs_waiting: null, house_operations: null }], '/x')).toEqual([])
  })
})

describe('PropertyGlance', () => {
  test('shows the key numbers, and hides what the viewer may not see', () => {
    mount(PropertyGlance, { props: { d: santos }, global: { plugins: [IonicVue] }, attachTo: document.body })
    expect(text()).toContain('3 of 4 places taken · 1 reserved')
    expect(text()).toContain('Collected this month')
    document.body.innerHTML = ''

    mount(PropertyGlance, { props: { d: empty }, global: { plugins: [IonicVue] }, attachTo: document.body })
    expect(text()).toContain('No rooms yet.')
    expect(text()).not.toContain('Collected this month')
  })
})

describe('PropertyDashboardView', () => {
  test('shows the tiles, what waits and rooms with unpaid shared bills, and opens the right tab', async () => {
    vi.mocked(dashboardService.property).mockResolvedValue(santos)
    const wrapper = mount(PropertyDashboardView, { props: { propertyId: 3 }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(dashboardService.property).toHaveBeenCalledWith(3)
    expect(text()).toContain('3 / 4')
    expect(text()).toContain('₱500.00')
    expect(text()).toContain('Room 203')
    expect(text()).toContain('Billed to Kim')

    const item = [...document.querySelectorAll('ion-item')].find((i) => i.textContent?.includes('payment to confirm'))!
    ;(item as HTMLElement).click()
    expect(wrapper.emitted('open')).toEqual([['billing']])
  })
})
