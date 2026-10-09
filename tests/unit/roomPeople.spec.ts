import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { IonicVue } from '@ionic/vue'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ApproveModal from '@/components/tenancy/ApproveModal.vue'
import RoomPeopleModal from '@/components/tenancy/RoomPeopleModal.vue'
import { bookingService } from '@/services/bookings'
import { tenancyService } from '@/services/tenancies'
import type { BookableUnit, BookingApplication } from '@/types/booking'
import type { RoomOccupant } from '@/types/tenancy'

vi.mock('@/services/bookings', () => ({ bookingService: { approve: vi.fn() } }))
vi.mock('@/services/tenancies', () => ({
  tenancyService: { leader: vi.fn(), occupants: vi.fn(), list: vi.fn(), addOccupant: vi.fn(), updateOccupant: vi.fn(), removeOccupant: vi.fn() },
}))
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

const page = () => document.body
const text = () => page().textContent ?? ''

async function press(label: string) {
  const el = [...page().querySelectorAll('ion-button')].find((b) => b.textContent?.trim() === label)
  if (!el) throw new Error(`No button "${label}"`)
  ;(el as HTMLElement).click()
  await flushPromises()
}

/** Open an Ionic overlay: it renders its content once its open prop turns on. */
async function show(wrapper: VueWrapper, props: Record<string, unknown>) {
  await wrapper.setProps(props)
  await flushPromises()
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => {
  document.body.innerHTML = ''
})

describe('ApproveModal', () => {
  const application = { id: 4, planned_move_in_on: '2026-10-25', applicant: { id: 5, name: 'Kim Santos' } } as unknown as BookingApplication
  const house: BookableUnit = { id: 11, room_code: '01', label: 'Whole house', kind: 'whole', capacity: 3, room_has_leader: false, rent_centavos: 450000 }
  const bed: BookableUnit = { id: 12, room_code: '02', label: 'Bed 1', kind: 'bedspace', capacity: 1, room_has_leader: false, rent_centavos: 200000 }
  const ledBed: BookableUnit = { ...bed, id: 13, label: 'Bed 2', room_has_leader: true }

  function mountApprove(units: BookableUnit[]) {
    return mount(ApproveModal, { props: { application: null, units }, global: { plugins: [IonicVue] }, attachTo: document.body })
  }

  test('a whole room asks who else will stay, and sends them with the approval', async () => {
    vi.mocked(bookingService.approve).mockResolvedValue('Reserved.')
    const wrapper = mountApprove([house])
    await show(wrapper, { application })

    expect(text()).toContain('Who else will stay?')
    expect(text()).toContain('The room fits 3, counting Kim.')
    expect(text()).not.toContain('the leader of this room')

    await press('Add a person')
    const name = page().querySelector('ion-input input') as HTMLInputElement
    name.value = ' Ericka Cruz '
    name.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    await press('Reserve')

    expect(bookingService.approve).toHaveBeenCalledWith(4, 11, { occupants: [{ name: 'Ericka Cruz' }] })
    expect(wrapper.emitted('approved')?.[0][0]).toBe('Reserved.')
  })

  test('a bedspace without a leader offers to name the applicant, and sends nothing extra otherwise', async () => {
    vi.mocked(bookingService.approve).mockResolvedValue('Reserved.')
    const wrapper = mountApprove([bed])
    await show(wrapper, { application })

    expect(text()).toContain('Make Kim the leader of this room')
    expect(text()).not.toContain('Who else will stay?')
    await press('Reserve')
    expect(bookingService.approve).toHaveBeenLastCalledWith(4, 12, {})

    ;(page().querySelector('ion-toggle') as HTMLElement).click()
    await flushPromises()
    await press('Reserve')
    expect(bookingService.approve).toHaveBeenLastCalledWith(4, 12, { leader: true })
  })

  test('a bedspace in a room that already has a leader offers nothing about leaders', async () => {
    const wrapper = mountApprove([ledBed])
    await show(wrapper, { application })

    expect(text()).not.toContain('the leader of this room')
  })
})

describe('RoomPeopleModal', () => {
  const room = { id: 9, code: 'B1-F2-03', rental_mode: 'whole' as const }
  const kim: RoomOccupant = {
    id: 1, room_id: 9, name: 'Kim Santos', contact_phone: null, has_account: true, is_leader_holder: true,
    joined_on: '2026-10-01', left_on: null, is_staying: true,
    emergency_contact: { name: 'Marta Santos', relationship: 'Mother', phone: '0917 555 0000' },
  }
  const ericka: RoomOccupant = {
    id: 2, room_id: 9, name: 'Ericka Cruz', contact_phone: '0918', has_account: false, is_leader_holder: false,
    joined_on: '2026-10-10', left_on: null, is_staying: true,
    emergency_contact: { name: 'Marta Cruz', relationship: null, phone: '0918 111 2222' },
  }

  beforeEach(() => {
    vi.mocked(tenancyService.leader).mockResolvedValue({
      id: 1, room_id: 9, user: { id: 5, name: 'Kim Santos', photo_url: null }, started_on: '2026-10-01', consent_recorded_at: '2026-10-01T09:00:00+08:00',
    })
  })

  function mountPeople(props: { staff: boolean; canManage: boolean }) {
    return mount(RoomPeopleModal, { props: { room: null, propertyId: 3, ...props }, global: { plugins: [IonicVue] }, attachTo: document.body })
  }

  test('staff see the leader, everyone staying and their emergency contacts, and can remove someone but not the leader', async () => {
    vi.mocked(tenancyService.occupants).mockResolvedValue([kim, ericka])
    const wrapper = mountPeople({ staff: true, canManage: true })
    await show(wrapper, { room })

    expect(text()).toContain('Room B1-F2-03')
    expect(text()).toContain('Who stays (2)')
    expect(text()).toContain('Emergency: Marta Cruz · 0918 111 2222')
    expect(text()).toContain('Emergency: Marta Santos (Mother)')
    // One Remove: Ericka's. Kim rents the room, so she has none.
    expect([...page().querySelectorAll('ion-button')].filter((b) => b.textContent?.trim() === 'Remove')).toHaveLength(1)
    expect(text()).toContain('In a room rented whole, the person who rents it is the leader.')
  })

  test('the leader sees the list without emergency contacts and cannot remove anyone', async () => {
    // The API leaves emergency contacts out for the leader.
    vi.mocked(tenancyService.occupants).mockResolvedValue([kim, ericka].map(({ emergency_contact, ...rest }) => (void emergency_contact, rest)))
    const wrapper = mountPeople({ staff: false, canManage: true })
    await show(wrapper, { room })

    expect(text()).toContain('Who stays (2)')
    expect(text()).not.toContain('Emergency:')
    const labels = [...page().querySelectorAll('ion-button')].map((b) => b.textContent?.trim())
    expect(labels).toContain('Left')
    expect(labels).not.toContain('Remove')
    expect(tenancyService.list).not.toHaveBeenCalled()
  })

  test('marking someone as back or adding a person goes through the service, then refreshes', async () => {
    vi.mocked(tenancyService.occupants).mockResolvedValue([kim, { ...ericka, left_on: '2026-10-20', is_staying: false }])
    vi.mocked(tenancyService.updateOccupant).mockResolvedValue(ericka)
    const wrapper = mountPeople({ staff: true, canManage: true })
    await show(wrapper, { room })

    expect(text()).toContain('Who stays (1)')
    await press('Back')

    expect(tenancyService.updateOccupant).toHaveBeenCalledWith(2, { left_on: null })
    expect(wrapper.emitted('changed')).toHaveLength(1)
    expect(tenancyService.occupants).toHaveBeenCalledTimes(2) // loaded again after the change
  })

  test('a bedspace room lists the people who live there, from their tenancies', async () => {
    vi.mocked(tenancyService.list).mockResolvedValue({
      items: [{ id: 1, tenant: { id: 5, name: 'Kim Santos' }, unit: { label: 'Bed 1' }, moved_in_on: '2026-10-01' } as never],
      meta: { current_page: 1, last_page: 1, total: 1 } as never,
    })
    const wrapper = mountPeople({ staff: true, canManage: true })
    await show(wrapper, { room: { ...room, rental_mode: 'bedspaces' } })

    expect(tenancyService.occupants).not.toHaveBeenCalled()
    expect(text()).toContain('Who lives here')
    expect(text()).toContain('Bed 1 · moved in Oct 1, 2026')
    expect(text()).toContain('Leader') // Kim is the leader
  })
})
