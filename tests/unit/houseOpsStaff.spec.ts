import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import HouseOpsSection from '@/components/property/HouseOpsSection.vue'
import { houseOpsService } from '@/services/houseOps'
import { propertyService } from '@/services/properties'
import { tenancyService } from '@/services/tenancies'
import type { CurfewViolation, LateEntry, Visitor } from '@/types/houseOps'
import type { Property, PropertySettings } from '@/types/property'
import type { Tenancy } from '@/types/tenancy'

vi.mock('@/services/houseOps', () => ({
  houseOpsService: {
    propertyLateEntries: vi.fn(),
    propertyVisitors: vi.fn(),
    propertyViolations: vi.fn(),
    approveLate: vi.fn(),
    declineLate: vi.fn(),
    approveVisitor: vi.fn(),
    declineVisitor: vi.fn(),
    checkIn: vi.fn(),
    checkOut: vi.fn(),
    logWalkIn: vi.fn(),
    logViolation: vi.fn(),
    removeViolation: vi.fn(),
  },
}))
vi.mock('@/services/properties', () => ({ propertyService: { settings: vi.fn() } }))
vi.mock('@/services/tenancies', () => ({ tenancyService: { list: vi.fn() } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
const dialog = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), alertController: dialog }))

const page = () => document.body
const text = () => page().textContent ?? ''

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

async function openTab(value: string) {
  page().querySelector('ion-segment')!.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }))
  await flushPromises()
}

const kim = { tenancy_id: 8, tenant: { id: 5, name: 'Kim' }, room: { id: 9, label: '203' } }
const late = { ...kim, id: 4, on_date: '2026-10-20', expected_arrival: '23:30', reason: 'Group project.', status: 'pending', status_label: 'Waiting', can: { decide: true, cancel: false } } as unknown as LateEntry
const leo = { ...kim, id: 7, name: 'Leo', contact: null, visit_on: '2026-10-18', expected_in: '14:00', overnight: false, nights: 0, status: 'registered', status_label: 'Registered', is_walk_in: false, over_limit: false, can: { decide: false, check_in: true, check_out: false, cancel: false } } as unknown as Visitor
const ana = { ...kim, id: 6, name: 'Ana', visit_on: '2026-10-20', overnight: true, nights: 2, status: 'pending', status_label: 'Waiting for approval', over_limit: true, can: { decide: true, check_in: false, check_out: false, cancel: false } } as unknown as Visitor
const night = { ...kim, id: 2, on_date: '2026-10-17', arrived_at: '23:40', note: null, logged_by: 'Carla', created_at: null } as unknown as CurfewViolation
const property = { id: 3, name: 'Santos House', abilities: ['view', 'handle_house_operations'] } as unknown as Property

function serve(curfew: string | null) {
  vi.mocked(propertyService.settings).mockResolvedValue({ values: { curfew_time: curfew } } as unknown as PropertySettings)
  vi.mocked(houseOpsService.propertyLateEntries).mockResolvedValue([late])
  vi.mocked(houseOpsService.propertyVisitors).mockImplementation(async (_id, view) => (view === 'pending' ? [ana] : [leo]))
  vi.mocked(houseOpsService.propertyViolations).mockResolvedValue({ items: [night], repeated: { 8: 3 } })
  vi.mocked(tenancyService.list).mockResolvedValue({ items: [{ id: 8, tenant: { name: 'Kim' }, room: { label: '203' } } as unknown as Tenancy], meta: {} as never })
}

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollTo = () => {}
  dialog.create.mockResolvedValue({ present: vi.fn(), onDidDismiss: async () => ({ role: 'confirm', data: { values: { reason: 'Exam week.' } } }) })
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('HouseOpsSection', () => {
  test('decides late-entry and overnight requests', async () => {
    serve('22:00')
    vi.mocked(houseOpsService.approveLate).mockResolvedValue({ item: late, message: 'Approved.' })
    vi.mocked(houseOpsService.declineVisitor).mockResolvedValue({ item: ana, message: 'Declined.' })
    mount(HouseOpsSection, { props: { property }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(text()).toContain('To decide (2)')
    expect(text()).toContain('back by 11:30 PM')
    expect(text()).toContain('Over the monthly limit')

    const approve = [...page().querySelectorAll('ion-button')].filter((b) => b.textContent?.trim() === 'Approve')
    ;(approve[0] as HTMLElement).click()
    await flushPromises()
    expect(houseOpsService.approveLate).toHaveBeenCalledWith(4)

    const decline = [...page().querySelectorAll('ion-button')].filter((b) => b.textContent?.trim() === 'Decline')
    ;(decline[1] as HTMLElement).click()
    await flushPromises()
    expect(houseOpsService.declineVisitor).toHaveBeenCalledWith(6, 'Exam week.')
  })

  test('checks visitors in and flags repeated late arrivals in the log', async () => {
    serve('22:00')
    vi.mocked(houseOpsService.checkIn).mockResolvedValue({ item: leo, message: 'Checked in.' })
    mount(HouseOpsSection, { props: { property }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    await openTab('visitors')
    await press('Check in')
    expect(houseOpsService.checkIn).toHaveBeenCalledWith(7)

    await openTab('log')
    expect(text()).toContain('Repeated late arrivals')
    expect(text()).toContain('Kim (3)')
    expect([...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())).not.toContain('Remove') // a Collector
  })

  test('without a curfew there is no curfew log and no late-entry requests', async () => {
    serve(null)
    mount(HouseOpsSection, { props: { property }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(houseOpsService.propertyLateEntries).not.toHaveBeenCalled()
    expect(text()).not.toContain('Curfew log')
    expect(text()).toContain('To decide (1)')
  })
})
