import { flushPromises, mount } from '@vue/test-utils'
import { IonButton, IonicVue } from '@ionic/vue'
import { describe, expect, test } from 'vitest'
import ListingRooms from '@/components/rooms/ListingRooms.vue'
import FloorPlan from '@/components/rooms/FloorPlan.vue'
import {
  autoLayout,
  bedDots,
  defaultRoomFilters,
  floorFreeText,
  floorShort,
  floorSummaries,
  floorTabText,
  isFreeFor,
  matchesFilters,
  roomStatusText,
  roomType,
  slotsText,
} from '@/lib/floors'
import type { PublicRoom } from '@/types/booking'

function room(over: Partial<PublicRoom>): PublicRoom {
  return {
    id: 1,
    label: '101',
    code: 'F1-01',
    door_no: null,
    floor: 1,
    rental_mode: 'bedspaces',
    rental_mode_label: 'Bedspaces',
    who_can_stay: 'any',
    who_can_stay_label: 'Anyone',
    status: 'available',
    available: 2,
    total: 4,
    capacity: 4,
    rent_from_centavos: 250000,
    availability_label: '2 of 4 bedspaces available',
    whole_option: null,
    ...over,
  }
}

const rooms: PublicRoom[] = [
  room({ id: 1, label: '101', code: 'F1-01', floor: 1, available: 2 }),
  room({ id: 2, label: '102', code: 'F1-02', floor: 1, available: 0, status: 'full' }),
  room({ id: 3, label: '201', code: 'F2-01', floor: 2, rental_mode: 'whole', available: 1, total: 1, capacity: 3, who_can_stay: 'female', who_can_stay_label: 'Female only' }),
  room({ id: 4, label: '202', code: 'F2-02', floor: 2, available: 4, whole_option: { available: true, rent_centavos: 800000, capacity: 4 } }),
  room({ id: 5, label: '301', code: 'F3-01', floor: 3, available: 0, status: 'full' }),
  room({ id: 6, label: '01', code: '01', floor: null, available: 1, who_can_stay: 'male' }),
]

describe('floors', () => {
  test('a room is free for a bedspace, a whole room (whole-rented or the whole option), or either', () => {
    expect(isFreeFor(rooms[0], 'bedspace')).toBe(true)
    expect(isFreeFor(rooms[0], 'whole')).toBe(false)
    expect(isFreeFor(rooms[2], 'whole')).toBe(true)
    expect(isFreeFor(rooms[3], 'whole')).toBe(true)
    expect(isFreeFor(rooms[1], 'any')).toBe(false)
  })

  test('who can stay matches rooms for that group or for anyone', () => {
    const female = { ...defaultRoomFilters(), who: 'female' as const }
    expect(matchesFilters(rooms[0], female)).toBe(true) // anyone
    expect(matchesFilters(rooms[2], female)).toBe(true) // female only
    expect(matchesFilters(rooms[5], female)).toBe(false) // male only
  })

  test('floors run top first, rooms without a floor last, with what is free on each', () => {
    const floors = floorSummaries(rooms, defaultRoomFilters())

    expect(floors.map((f) => f.label)).toEqual(['3rd floor', '2nd floor', '1st floor', 'No floor set'])
    expect(floors.map((f) => f.rooms.map((r) => r.id))).toEqual([[], [3, 4], [1], [6]])
    expect(floors.map(floorFreeText)).toEqual(['Full', '2 rooms free · 4 beds', '1 room free · 2 beds', '1 room free · 1 bed'])
    expect(floors[2].totalRooms).toBe(2)
  })

  test('whole rooms only: no bed counts, and floors with only bedspace rooms drop out', () => {
    const floors = floorSummaries(rooms, { ...defaultRoomFilters(), kind: 'whole' })

    expect(floors.map((f) => f.rooms.map((r) => r.id))).toEqual([[], [3, 4], [], []])
    expect(floorFreeText(floors[1])).toBe('2 rooms free')
  })

  test('with "free only" off, full rooms are listed too', () => {
    const floors = floorSummaries(rooms, { ...defaultRoomFilters(), availableOnly: false })

    expect(floors.map((f) => f.rooms.length)).toEqual([1, 2, 2, 1])
    expect(floorFreeText(floors[0])).toBe('Full')
  })

  test('pin bubble text', () => {
    expect(slotsText(1)).toBe('1 slot')
    expect(slotsText(3)).toBe('3 slots')
  })

  test('room types come from the rental mode and how many fit', () => {
    expect(roomType(rooms[0])).toBe('Bedspace')
    expect(roomType(room({ rental_mode: 'whole', capacity: 1 }))).toBe('Solo')
    expect(roomType(room({ rental_mode: 'whole', capacity: 2 }))).toBe('Whole room')
    expect(roomType(rooms[2])).toBe('Family')
  })

  test('one dot per bed, free ones first; whole rooms have none', () => {
    expect(bedDots(rooms[0])).toEqual([true, true, false, false])
    expect(bedDots(rooms[2])).toEqual([])
  })

  test('the automatic plan puts rooms in code order, first half along the top', () => {
    const ten = room({ id: 10, code: 'F1-10' })
    const two = room({ id: 2, code: 'F1-02' })
    const one = room({ id: 1, code: 'F1-01' })

    const { top, bottom } = autoLayout([ten, two, one])

    expect(top.map((r) => r.code)).toEqual(['F1-01', 'F1-02'])
    expect(bottom.map((r) => r.code)).toEqual(['F1-10'])
  })

  test('short floor names and tab text follow the filters', () => {
    expect([floorShort(2), floorShort(0), floorShort(-1), floorShort(null)]).toEqual(['2F', 'G', 'B1', 'No floor'])
    expect(floorSummaries(rooms, defaultRoomFilters()).map(floorTabText)).toEqual(['3F · full', '2F · 2 free', '1F · 1 free', 'No floor · 1 free'])
    expect(floorSummaries(rooms, { ...defaultRoomFilters(), kind: 'whole' }).map(floorTabText)[0]).toBe('3F · no match')
  })

  test("a room's status line", () => {
    expect(roomStatusText(rooms[0])).toBe('2 of 4 free')
    expect(roomStatusText(rooms[1])).toBe('Full')
    expect(roomStatusText(rooms[2])).toBe('Free · up to 3')
    expect(roomStatusText(rooms[3])).toBe('4 of 4 free · or whole')
    expect(roomStatusText(room({ rental_mode: 'whole', available: 0, status: 'full' }))).toBe('Taken')
    expect(roomStatusText(room({ available: 0, status: 'not_ready' }))).toBe('Not ready')
  })
})

describe('FloorPlan', () => {
  test('draws every room on the floor with its type, beds and status; non-matching rooms are dimmed', async () => {
    const wrapper = mount(FloorPlan, { props: { rooms: [rooms[2], rooms[3]], matchIds: [4], label: '2nd floor' } })

    const cells = wrapper.findAll('.room')
    expect(cells.map((c) => c.find('.name').text())).toEqual(['201', '202'])
    expect(wrapper.find('.row.top .room .name').text()).toBe('201')
    expect(wrapper.find('.row.bottom .room .name').text()).toBe('202')
    expect(cells[0].text()).toContain('Family · Female only')
    expect(cells[0].text()).toContain('Free')
    expect(cells[0].classes()).toContain('dim')
    const second = wrapper.find('.row.bottom .room')
    expect(second.findAll('.beds i.free')).toHaveLength(4)
    expect(second.text()).toContain('4 of 4 free · or whole')

    await second.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[4]])
  })
})

describe('ListingRooms', () => {
  const mountRooms = (list: PublicRoom[]) => mount(ListingRooms, { props: { rooms: list }, global: { plugins: [IonicVue] }, attachTo: document.body })

  test('starts on the building; a floor with matches opens its rooms, and "All floors" goes back', async () => {
    const wrapper = mountRooms(rooms)

    const floorButtons = wrapper.findAll('.floor')
    expect(floorButtons.map((b) => b.find('.label').text())).toEqual(['3rd floor', '2nd floor', '1st floor', 'No floor set'])
    expect(floorButtons[0].attributes('disabled')).toBeDefined()
    expect(wrapper.find('.room').exists()).toBe(false)

    await floorButtons[1].trigger('click')
    expect(wrapper.find('.floor-tab.on').text()).toBe('2F · 2 free')
    expect(wrapper.findAll('.room .name').map((t) => t.text())).toEqual(['201', '202'])

    wrapper.find('.floor-head ion-button').element.dispatchEvent(new Event('click'))
    await flushPromises()
    expect(wrapper.findAll('.floor')).toHaveLength(4)
    wrapper.unmount()
  })

  test('floor tabs switch floors and clear the selection', async () => {
    const wrapper = mountRooms(rooms)
    await wrapper.findAll('.floor')[1].trigger('click')
    await wrapper.findAll('.room')[0].trigger('click')
    expect(wrapper.find('.preview').exists()).toBe(true)

    await wrapper.findAll('.floor-tab').find((t) => t.text().startsWith('1F'))!.trigger('click')

    expect(wrapper.findAll('.room .name').map((t) => t.text())).toEqual(['101', '102'])
    expect(wrapper.find('.preview').exists()).toBe(false)
    wrapper.unmount()
  })

  test('tapping a room shows all its details beside the plan, with Apply and Rent the whole room', async () => {
    const wrapper = mount(ListingRooms, { props: { rooms, applyHref: '/listings/9/apply' }, global: { plugins: [IonicVue] }, attachTo: document.body })
    await wrapper.findAll('.floor')[1].trigger('click')
    expect(wrapper.find('.detail-col .pick').exists()).toBe(true)

    await wrapper.findAll('.room')[1].trigger('click')

    expect(wrapper.find('.room.selected .name').text()).toBe('202')
    const preview = wrapper.find('.detail-col .preview')
    expect(preview.text()).toContain('Room 202 · Bedspace')
    expect(preview.text()).toContain('4 of 4 free · or whole')
    expect(preview.text()).toContain('Or the whole room for up to 4')
    expect(preview.text()).toContain('Shared spaces such as the CR')
    const [apply, whole] = preview.findAllComponents(IonButton)
    expect(apply.text()).toBe('Rent a bedspace')
    expect(apply.props('routerLink')).toBe('/listings/9/apply?room=4')
    expect(whole.text()).toBe('Rent the whole room')
    expect(whole.props('routerLink')).toBe('/listings/9/apply?room=4&whole=1')
    wrapper.unmount()
  })

  test("opened from Find, the rooms start on the Find page's choices; rooms outside the price range fade", async () => {
    const wrapper = mount(ListingRooms, {
      props: { rooms, initialFilters: { kind: 'bedspace', minRent: 100000, maxRent: 200000 } },
      global: { plugins: [IonicVue] },
      attachTo: document.body,
    })
    expect(wrapper.find('.price-chip').text()).toBe('₱1,000–₱2,000')
    // every room here costs ₱2,500, over the range, so no floor can be opened
    expect(wrapper.findAll('.floor').filter((f) => f.attributes('disabled') === undefined).map((f) => f.find('.label').text())).toEqual([])

    wrapper.find('.price-chip').element.dispatchEvent(new Event('click'))
    await flushPromises()
    expect(wrapper.find('.price-chip').exists()).toBe(false)
    expect(wrapper.findAll('.floor').filter((f) => f.attributes('disabled') === undefined).map((f) => f.find('.label').text())).toEqual(['2nd floor', '1st floor', 'No floor set'])
    wrapper.unmount()
  })

  test('the price range uses the whole-room price when looking for whole rooms; rooms with no rent stay in', () => {
    const f = { ...defaultRoomFilters(), minRent: 700000, maxRent: 900000 }
    expect(matchesFilters(rooms[3], { ...f, kind: 'whole' })).toBe(true) // whole option ₱8,000
    expect(matchesFilters(rooms[3], { ...f, kind: 'bedspace' })).toBe(false) // ₱2,500 a bedspace
    expect(matchesFilters(room({ rent_from_centavos: null }), f)).toBe(true)
  })

  test('a place with one floor opens straight on its plan, the full room dimmed', () => {
    const wrapper = mountRooms([rooms[0], rooms[1]])

    expect(wrapper.find('.floor').exists()).toBe(false)
    expect(wrapper.find('.floor-head').exists()).toBe(false)
    expect(wrapper.findAll('.room .name').map((t) => t.text())).toEqual(['101', '102'])
    expect(wrapper.findAll('.room.dim .name').map((t) => t.text())).toEqual(['102'])
    wrapper.unmount()
  })
})
