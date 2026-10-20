import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ReportSheet from '@/components/maintenance/ReportSheet.vue'
import RequestSheet from '@/components/maintenance/RequestSheet.vue'
import MaintenanceSection from '@/components/property/MaintenanceSection.vue'
import { maintenanceService } from '@/services/maintenance'
import type { MaintenanceRequest } from '@/types/maintenance'
import type { Property } from '@/types/property'

vi.mock('@/services/maintenance', () => ({
  maintenanceService: {
    report: vi.fn(),
    log: vi.fn(),
    forProperty: vi.fn(),
    get: vi.fn(),
    start: vi.fn(),
    resolve: vi.fn(),
    confirm: vi.fn(),
    reopen: vi.fn(),
    cancel: vi.fn(),
    assign: vi.fn(),
    setCost: vi.fn(),
    charge: vi.fn(),
    setNotReady: vi.fn(),
    note: vi.fn(),
  },
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
// Dialogs answer with what each test sets.
const dialog = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@ionic/vue', async (original) => ({ ...(await original<typeof import('@ionic/vue')>()), alertController: dialog }))
// Scrollable segments scroll the chosen button into view; jsdom has no scrolling.
Element.prototype.scrollTo = () => {}

const page = () => document.body
const text = () => page().textContent ?? ''
const buttons = () => [...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

const answer = (role: string, values?: unknown) => dialog.create.mockResolvedValue({ present: vi.fn(), onDidDismiss: async () => ({ role, data: { values } }) })

const can = { start: false, resolve: false, assign: false, set_cost: false, cancel: false, confirm: false, reopen: false, charge: false, set_not_ready: false, add_note: true }
const leak = {
  id: 9,
  property: { id: 3, name: 'Santos House' },
  room: { id: 4, label: '203' },
  reported_by: { id: 5, name: 'Kim' },
  category: 'plumbing',
  category_label: 'Plumbing',
  description: 'The sink is leaking.',
  urgency: 'urgent',
  urgency_label: 'Urgent',
  status: 'submitted',
  status_label: 'Submitted',
  assignee: null,
  resolution: null,
  cancel_reason: null,
  created_at: '2026-10-18T10:00:00+08:00',
  started_at: null,
  resolved_at: null,
  closed_at: null,
  cancelled_at: null,
  photos: [],
  history: [],
  charge: null,
  unit: { id: 11, label: 'Bed 1', not_ready: false, not_ready_reason: null },
  can,
} as unknown as MaintenanceRequest

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('ReportSheet', () => {
  test('a boarder reports for their stay; it needs a description', async () => {
    vi.mocked(maintenanceService.report).mockResolvedValue({ request: leak, message: 'Request sent.' })
    const wrapper = mount(ReportSheet, { props: { open: false }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await flushPromises()

    await press('Send request')
    expect(toast.error).toHaveBeenCalledWith('Say what is wrong.')

    const box = page().querySelector('ion-textarea textarea') as HTMLTextAreaElement
    box.value = 'The sink is leaking.'
    box.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    await press('Send request')
    expect(maintenanceService.report).toHaveBeenCalledWith(expect.objectContaining({ category: 'plumbing', urgency: 'normal', description: 'The sink is leaking.', room_id: null }))
    expect(maintenanceService.log).not.toHaveBeenCalled()
    expect(wrapper.emitted('done')?.[0][0]).toBe('Request sent.')
  })
})

describe('RequestSheet', () => {
  async function show(item: MaintenanceRequest, props: Record<string, unknown> = {}) {
    vi.mocked(maintenanceService.get).mockResolvedValue(item)
    const wrapper = mount(RequestSheet, { props: { requestId: null, ...props }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.setProps({ requestId: item.id })
    await flushPromises()
    return wrapper
  }

  test('staff see only the actions the API allows, and starting work updates the sheet', async () => {
    vi.mocked(maintenanceService.start).mockResolvedValue({ request: { ...leak, status: 'in_progress', status_label: 'In progress' } as MaintenanceRequest, message: 'Marked as in progress.' })
    const wrapper = await show({ ...leak, can: { ...can, start: true, resolve: true, assign: true } } as MaintenanceRequest, { assignees: [] })

    expect(buttons()).toEqual(expect.arrayContaining(['Start work', 'Mark as fixed', 'Assign']))
    expect(buttons()).not.toContain('Charge the boarder')
    expect(buttons()).not.toContain('Repair cost')

    await press('Start work')
    expect(maintenanceService.start).toHaveBeenCalledWith(9)
    expect(text()).toContain('In progress')
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  test('the boarder confirms a fix or sends it back with a reason', async () => {
    const fixed = { ...leak, status: 'resolved', status_label: 'Resolved', can: { ...can, confirm: true, reopen: true } } as MaintenanceRequest
    vi.mocked(maintenanceService.reopen).mockResolvedValue({ request: { ...leak, status: 'in_progress' } as MaintenanceRequest, message: 'Sent back.' })
    await show(fixed)

    expect(text()).toContain('Is it fixed?')
    answer('confirm', { reason: 'Still dripping at night.' })
    await press('Still broken')
    expect(maintenanceService.reopen).toHaveBeenCalledWith(9, 'Still dripping at night.')
  })

  test('a charge needs an amount and a reason', async () => {
    vi.mocked(maintenanceService.charge).mockResolvedValue({ request: leak, message: 'Charge added.' })
    await show({ ...leak, can: { ...can, charge: true } } as MaintenanceRequest, { assignees: [] })

    answer('confirm', { amount: '500', reason: '' })
    await press('Charge the boarder')
    expect(toast.error).toHaveBeenCalledWith('Give a reason.')
    answer('confirm', { amount: '500', reason: 'Broke the faucet' })
    await press('Charge the boarder')
    expect(maintenanceService.charge).toHaveBeenCalledWith(9, 50000, 'Broke the faucet')
  })
})

describe('MaintenanceSection', () => {
  test('lists open requests and switches to fixed ones', async () => {
    vi.mocked(maintenanceService.forProperty).mockResolvedValue([leak])
    const property = { id: 3, name: 'Santos House', rooms: [], caretakers: null, abilities: ['handle_maintenance'] } as unknown as Property
    mount(MaintenanceSection, { props: { property }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await flushPromises()

    expect(maintenanceService.forProperty).toHaveBeenCalledWith(3, 'open')
    expect(text()).toContain('Plumbing · Room 203')
    expect(text()).toContain('Urgent')

    page().querySelector('ion-segment')!.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'resolved' } }))
    await flushPromises()
    expect(maintenanceService.forProperty).toHaveBeenLastCalledWith(3, 'resolved')
  })
})
