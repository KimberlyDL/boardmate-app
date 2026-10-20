import { flushPromises, mount } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import MyStayPage from '@/views/boarder/MyStayPage.vue'
import { tenancyService } from '@/services/tenancies'
import type { Tenancy } from '@/types/tenancy'

vi.mock('@/services/groups', () => ({ groupService: { mine: vi.fn(async () => []) } }))
vi.mock('@/services/houseRules', () => ({
  houseRuleService: { forProperty: vi.fn(async () => ({ current: null, draft: null, automatic: [], versions: [] })), forStay: vi.fn(async () => ({ current: null, needs_acceptance: false, acceptances: [] })) },
}))
vi.mock('@/services/tenancies', () => ({
  tenancyService: { mine: vi.fn(), giveNotice: vi.fn(), withdrawNotice: vi.fn(), settlementSummaryLink: vi.fn() },
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
// The date dialog answers "Send notice" for Dec 1; entering the page runs the callback at once.
const dialog = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@ionic/vue', async (original) => ({
  ...(await original<typeof import('@ionic/vue')>()),
  onIonViewWillEnter: (cb: () => void) => cb(),
  alertController: dialog,
}))

const page = () => document.body
const text = () => page().textContent ?? ''
const buttons = () => [...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

const kim = {
  id: 8,
  status: 'active',
  property: { id: 3, name: 'Santos House' },
  room: { id: 9, code: 'F2-03', door_no: '203', label: '203', rental_mode: 'bedspaces', let_whole: false },
  unit: { id: 11, label: 'Bed 1', kind: 'bedspace' },
  tenant: { id: 5, name: 'Kim Santos', phone: null, photo_url: null },
  moved_in_on: '2026-09-25',
  first_day_on: '2026-09-26',
  anchor_day: 25,
  next_rent_due_on: '2026-11-25',
  rent_centavos: 400000,
  discount: null,
  rent_after_discount_centavos: 400000,
  scheduled_discount: null,
  emergency_contact: { name: 'Marta Santos', relationship: 'Mother', phone: '0917 555 0000' },
  end_on: null,
  is_overstaying: false,
  moved_out_on: null,
  pending_notice: null,
  is_leader: false,
  notice_rules: { suggested_days: 30, minimum_days: 14 },
  is_settled: false,
} as unknown as Tenancy

function serve(current: Tenancy[], past: Tenancy[] = []) {
  vi.mocked(tenancyService.mine).mockImplementation(async (wantPast = false) => (wantPast ? past : current))
}

const mountStay = () => mount(MyStayPage, { global: { plugins: [IonicVue], stubs: { IonBackButton: true } }, attachTo: document.body })

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  document.body.innerHTML = ''
})

describe('MyStayPage leaving', () => {
  test('gives notice with the place\'s suggested days, then shows it waiting and withdraws it', async () => {
    serve([kim])
    dialog.create.mockResolvedValue({ present: vi.fn(), onDidDismiss: async () => ({ role: 'confirm', data: { values: { end_on: '2026-12-01' } } }) })
    vi.mocked(tenancyService.giveNotice).mockResolvedValue({ notice: {} as never, message: 'Notice sent. The owner will confirm your last day.' })
    mountStay()
    await flushPromises()

    expect(text()).toContain("They ask for 30 days' notice.")
    await press('Give notice')
    expect(dialog.create.mock.calls[0][0].message).toContain('Less than 14 days is short notice')
    expect(tenancyService.giveNotice).toHaveBeenCalledWith(8, '2026-12-01')
    expect(toast.success).toHaveBeenCalledWith('Notice sent. The owner will confirm your last day.')

    document.body.innerHTML = ''
    serve([{ ...kim, pending_notice: { id: 70, end_on: '2026-12-01', is_short_notice: false, filed_at: null } }])
    vi.mocked(tenancyService.withdrawNotice).mockResolvedValue('Notice withdrawn.')
    mountStay()
    await flushPromises()
    expect(text()).toContain('Notice sent: last day Dec 1, 2026.')
    await press('Withdraw notice')
    expect(tenancyService.withdrawNotice).toHaveBeenCalledWith(8)
  })

  test('shows the approved last day, and warns once it has passed', async () => {
    serve([{ ...kim, status: 'notice_given', end_on: '2026-11-10', is_overstaying: true } as Tenancy])
    mountStay()
    await flushPromises()

    expect(text()).toContain('Your last day: Nov 10, 2026.')
    expect(text()).toContain('That day has passed.')
    expect(buttons()).not.toContain('Give notice')
  })

  test('lists past stays: waiting for the deposit, or settled with the summary', async () => {
    const tab = { location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window)
    vi.mocked(tenancyService.settlementSummaryLink).mockResolvedValue({ url: 'https://api.test/documents/settlements/2?signature=z', expires_in_minutes: 30 })
    serve([], [
      { ...kim, id: 8, status: 'settled', moved_out_on: '2026-11-25', is_settled: true } as Tenancy,
      { ...kim, id: 6, status: 'ended', property: { id: 4, name: 'Reyes Dorm' }, moved_out_on: '2026-08-31', is_settled: false } as Tenancy,
    ])
    mountStay()
    await flushPromises()

    expect(text()).toContain('You are not moved in anywhere yet.')
    expect(text()).toContain('Past stays')
    expect(text()).toContain('Your deposit is settled.')
    expect(text()).toContain('The owner will settle your deposit soon.')
    await press('Settlement summary (PDF)')
    expect(tenancyService.settlementSummaryLink).toHaveBeenCalledWith(8)
    expect(tab.location.href).toBe('https://api.test/documents/settlements/2?signature=z')
    open.mockRestore()
  })
})
