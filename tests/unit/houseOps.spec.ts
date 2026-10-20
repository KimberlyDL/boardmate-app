import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import VisitorSheet from '@/components/houseOps/VisitorSheet.vue'
import VisitsPage from '@/views/boarder/VisitsPage.vue'
import { houseOpsService } from '@/services/houseOps'
import { tenancyService } from '@/services/tenancies'
import type { LateEntry, Visitor } from '@/types/houseOps'
import type { Tenancy } from '@/types/tenancy'

vi.mock('@/services/houseOps', () => ({
  houseOpsService: {
    visitors: vi.fn(),
    lateEntries: vi.fn(),
    violations: vi.fn(),
    registerVisitor: vi.fn(),
    cancelVisitor: vi.fn(),
    askLate: vi.fn(),
    cancelLate: vi.fn(),
    muteReminders: vi.fn(),
  },
}))
vi.mock('@/services/tenancies', () => ({ tenancyService: { mine: vi.fn() } }))
vi.mock('@/services/groups', () => ({ groupService: { mine: vi.fn(async () => []) } }))
vi.mock('@/services/houseRules', () => ({ houseRuleService: { forStay: vi.fn(async () => null) } }))
vi.mock('vue-router', async (original) => ({ ...(await original<typeof import('vue-router')>()), useRoute: () => ({ query: {} }) }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
const dialog = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@ionic/vue', async (original) => ({
  ...(await original<typeof import('@ionic/vue')>()),
  onIonViewWillEnter: (cb: () => void) => cb(),
  alertController: dialog,
}))

const page = () => document.body
const text = () => page().textContent ?? ''

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

async function type(label: string, value: string) {
  const input = [...page().querySelectorAll('ion-input')].find((i) => i.querySelector('.label-text')?.textContent === label)?.querySelector('input')
  if (!input) throw new Error(`No input "${label}"`)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

const stay = { id: 8, property: { id: 3, name: 'Santos House' }, curfew: { time: '22:00', reminder_minutes: 30, reminders_muted: false } } as unknown as Tenancy
const ana = {
  id: 1, tenancy_id: 8, tenant: { id: 5, name: 'Kim' }, room: null, name: 'Ana Cruz', contact: null, visit_on: '2026-10-20', expected_in: '14:00', expected_out: '18:00',
  overnight: false, nights: 0, status: 'registered', status_label: 'Registered', is_walk_in: false, over_limit: false, decided_by: null, decline_reason: null,
  checked_in_at: null, checked_out_at: null, can: { decide: false, check_in: false, check_out: false, cancel: true },
} as unknown as Visitor
const late = {
  id: 4, tenancy_id: 8, tenant: { id: 5, name: 'Kim' }, room: null, on_date: '2026-10-20', expected_arrival: '23:30', reason: 'Group project.',
  status: 'declined', status_label: 'Declined', decided_by: 'Carla', decided_at: null, decline_reason: 'Exam week.', created_at: null, can: { decide: false, cancel: false },
} as unknown as LateEntry

beforeEach(() => {
  vi.clearAllMocks()
  Element.prototype.scrollTo = () => {}
  dialog.create.mockResolvedValue({ present: vi.fn(), onDidDismiss: async () => ({ role: 'confirm' }) })
})
afterEach(() => {
  document.body.innerHTML = ''
})

describe('VisitorSheet', () => {
  test('warns when an overnight stay goes over the monthly limit, and sends the visit', async () => {
    vi.mocked(houseOpsService.registerVisitor).mockResolvedValue({ item: ana, message: 'Registered. The overnight stay waits for approval.' })
    const wrapper = mount(VisitorSheet, { props: { open: false, tenancyId: 8, nightsInfo: { used: 2, limit: 3, needs_approval: true } }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.setProps({ open: true })
    await flushPromises()

    await press('Register')
    expect(toast.error).toHaveBeenCalledWith("Enter the visitor's name.")

    await type("Visitor's name", 'Ana Cruz')
    const toggle = page().querySelector('ion-toggle')!
    toggle.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: true } }))
    await flushPromises()
    await type('Nights', '2')
    expect(text()).toContain('You have used 2 of 3 nights this month.')
    expect(text()).toContain('This goes over the limit')

    await press('Register')
    expect(houseOpsService.registerVisitor).toHaveBeenCalledWith(8, expect.objectContaining({ name: 'Ana Cruz', overnight: true, nights: 2, expected_out: null }))
    expect(wrapper.emitted('done')?.[0][0]).toBe('Registered. The overnight stay waits for approval.')
  })
})

describe('VisitsPage', () => {
  test('lists visitors, cancels one, and shows late-entry decisions', async () => {
    vi.mocked(tenancyService.mine).mockResolvedValue([stay])
    vi.mocked(houseOpsService.visitors).mockResolvedValue({ items: [ana], nights: { used: 0, limit: 3, needs_approval: true } })
    vi.mocked(houseOpsService.lateEntries).mockResolvedValue([late])
    vi.mocked(houseOpsService.violations).mockResolvedValue([])
    vi.mocked(houseOpsService.cancelVisitor).mockResolvedValue({ item: { ...ana, status: 'cancelled' } as Visitor, message: 'Visit cancelled.' })
    mount(VisitsPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true } }, attachTo: document.body })
    await flushPromises()

    expect(text()).toContain('Ana Cruz')
    expect(text()).toContain('0 of 3 nights used this month; each stay needs approval')
    await press('Cancel')
    expect(houseOpsService.cancelVisitor).toHaveBeenCalledWith(1)
    expect(toast.success).toHaveBeenCalledWith('Visit cancelled.')

    page().querySelector('ion-segment')!.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'late' } }))
    await flushPromises()
    expect(text()).toContain('The curfew is 10:00 PM.')
    expect(text()).toContain('Declined: Exam week.')
  })

  test('without a curfew there is no late-entry tab', async () => {
    vi.mocked(tenancyService.mine).mockResolvedValue([{ ...stay, curfew: { time: null, reminder_minutes: 30, reminders_muted: false } } as Tenancy])
    vi.mocked(houseOpsService.visitors).mockResolvedValue({ items: [], nights: { used: 0, limit: 3, needs_approval: true } })
    mount(VisitsPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true } }, attachTo: document.body })
    await flushPromises()

    expect(page().querySelector('ion-segment')).toBeNull()
    expect(houseOpsService.lateEntries).not.toHaveBeenCalled()
  })
})

describe('MyStayPage curfew card', () => {
  test('shows the curfew and turns the reminder off', async () => {
    const { default: MyStayPage } = await import('@/views/boarder/MyStayPage.vue')
    const full = {
      ...stay, status: 'active', room: { id: 9, label: '203', let_whole: false }, unit: { id: 11, label: 'Bed 1' }, moved_in_on: '2026-10-01', anchor_day: 1,
      next_rent_due_on: '2026-11-01', rent_centavos: 200000, rent_after_discount_centavos: 200000, discount: null, scheduled_discount: null,
      emergency_contact: { name: 'Marta', relationship: null, phone: '0917' }, pending_notice: null, is_leader: false, notice_rules: null,
    } as unknown as Tenancy
    vi.mocked(tenancyService.mine).mockImplementation(async (past = false) => (past ? [] : [full]))
    vi.mocked(houseOpsService.muteReminders).mockResolvedValue('Curfew reminders off.')
    mount(MyStayPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true, RoomPeopleModal: true } }, attachTo: document.body })
    await flushPromises()

    expect(text()).toContain('Curfew: 10:00 PM')
    page().querySelector('ion-toggle')!.dispatchEvent(new CustomEvent('ionChange', { detail: { checked: false } }))
    await flushPromises()
    expect(houseOpsService.muteReminders).toHaveBeenCalledWith(8, true)
    expect(toast.success).toHaveBeenCalledWith('Curfew reminders off.')
  })
})
