import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import MoveInModal from '@/components/tenancy/MoveInModal.vue'
import { tenancyService } from '@/services/tenancies'
import type { BookingApplication } from '@/types/booking'
import type { MoveInQuote } from '@/types/tenancy'

vi.mock('@/services/tenancies', () => ({ tenancyService: { preview: vi.fn(), moveIn: vi.fn(), moveInWalkIn: vi.fn() } }))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

/** Kim rents a house at ₱4,500; with ₱500 off, deposit and first rent are ₱4,000. */
const quote: MoveInQuote = {
  rent_centavos: 450000,
  discount_centavos: 50000,
  rent_after_discount_centavos: 400000,
  deposit_centavos: 400000,
  first_rent_centavos: 400000,
  activation_required: true,
}

const reservation = {
  id: 7,
  status: 'approved',
  property: { id: 3, name: 'Santos House', rental_mode: 'whole' },
  unit: { id: 11, label: 'Whole house', rent_centavos: 450000 },
  planned_move_in_on: '2026-10-25',
  reserved_until: '2026-11-01',
  leader_on_move_in: true,
  applicant: { id: 5, name: 'Kim Santos', email: 'kim@example.com', phone: '0917', photo_url: null },
  planned_occupants: [{ name: 'Ericka Cruz', emergency_contact_name: 'Marta Cruz', emergency_contact_phone: '0918 111 2222' }],
} as unknown as BookingApplication

function mountModal() {
  return mount(MoveInModal, {
    props: { open: false, property: { id: 3, name: 'Santos House' }, application: reservation },
    global: { plugins: [IonicVue] },
    attachTo: document.body,
  })
}

/** Open the sheet and wait for the first quote (the form re-quotes after a short pause). */
async function open(wrapper: VueWrapper) {
  await wrapper.setProps({ open: true })
  await vi.advanceTimersByTimeAsync(400)
  await flushPromises()
}

/** The sheet's content lives in the page (Ionic puts overlays in the body). */
const page = () => document.body

/** The native <input> of the ion-input with this label (the nth one, when a label repeats). */
function field(label: string, nth = 0): HTMLInputElement {
  const matches = [...page().querySelectorAll('ion-input')].filter((i) => i.querySelector('.label-text')?.textContent === label)
  const input = matches[nth]?.querySelector('input')
  if (!input) throw new Error(`No input labelled "${label}" (#${nth})`)
  return input
}

/** Type into a field the way a person does, so Ionic and v-model both see it. */
async function type(label: string, value: string, nth = 0) {
  const input = field(label, nth)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await flushPromises()
}

async function press(text: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === text)
  if (!el) throw new Error(`No button "${text}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

async function tick(label: string) {
  const el = [...page().querySelectorAll('ion-checkbox')].find((c) => c.textContent?.includes(label))
  if (!el) throw new Error(`No checkbox "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.mocked(tenancyService.preview).mockResolvedValue(quote)
  vi.mocked(tenancyService.moveIn).mockResolvedValue({ message: 'Kim Santos is moved in.', tenancy: { id: 1 } as never })
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
  document.body.innerHTML = ''
})

describe('MoveInModal (from a reservation)', () => {
  test('shows what the rent, deposit and first rent come to, and fills in what is owed', async () => {
    const wrapper = mountModal()
    await open(wrapper)

    expect(tenancyService.preview).toHaveBeenCalledWith(3, expect.objectContaining({ unit_id: 11 }))
    const text = page().textContent ?? ''
    expect(text).toContain('₱4,500.00') // rent
    expect(text).toContain('−₱500.00') // agreed rate
    expect(text).toContain('Rent after discount')
    expect(text).toContain('First rent (advance, no utilities)')
    // The person planned at approval is already listed, and what is owed is typed in.
    expect(field('Name', 1).value).toBe('Ericka Cruz')
    expect([field('Amount (₱)', 0).value, field('Amount (₱)', 1).value]).toEqual(['4000', '4000'])
  })

  test('refuses without an emergency contact, and sends nothing', async () => {
    const wrapper = mountModal()
    await open(wrapper)

    await press('Move in')

    expect(toast.error).toHaveBeenCalledWith('Add an emergency contact for the tenant.')
    expect(tenancyService.moveIn).not.toHaveBeenCalled()
  })

  test('moves her in with the amounts in centavos and the leader consent recorded', async () => {
    const wrapper = mountModal()
    await open(wrapper)

    await type('Name', 'Marta Santos')
    await type('Phone', '0917 555 0000')
    await tick('agreed to be the room')
    await press('Move in')

    expect(tenancyService.moveIn).toHaveBeenCalledTimes(1)
    const [id, body] = vi.mocked(tenancyService.moveIn).mock.calls[0]
    expect(id).toBe(7)
    expect(body).toMatchObject({
      emergency_contact: { name: 'Marta Santos', phone: '0917 555 0000' },
      deposit: { amount_centavos: 400000, method: 'cash' },
      first_rent: { amount_centavos: 400000, method: 'cash' },
      leader_consent: true,
      occupants: [{ name: 'Ericka Cruz', emergency_contact_name: 'Marta Cruz', emergency_contact_phone: '0918 111 2222' }],
    })
    expect(wrapper.emitted('done')?.[0][0]).toBe('Kim Santos is moved in.')
  })

  test('asks for a reason when the first rent is short, and will not send without one', async () => {
    const wrapper = mountModal()
    await open(wrapper)
    expect(page().textContent).not.toContain('Not recorded in full')

    await type('Name', 'Marta Santos')
    await type('Phone', '0917 555 0000')
    await type('Amount (₱)', '1000', 1) // first rent short by ₱3,000
    await tick('agreed to be the room')

    expect(page().textContent).toContain('the first rent is short by ₱3,000.00')

    await press('Move in')
    expect(toast.error).toHaveBeenCalledWith('Give a reason for moving in without the full deposit and first rent.')
    expect(tenancyService.moveIn).not.toHaveBeenCalled()

    // With a reason it goes through, and the reason is sent with it.
    const reason = page().querySelector('ion-textarea textarea') as HTMLTextAreaElement
    reason.value = 'Trusted, pays Friday'
    reason.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    await press('Move in')

    expect(tenancyService.moveIn).toHaveBeenCalledTimes(1)
    expect(vi.mocked(tenancyService.moveIn).mock.calls[0][1]).toMatchObject({
      first_rent: { amount_centavos: 100000 },
      override_reason: 'Trusted, pays Friday',
    })
  })
})
