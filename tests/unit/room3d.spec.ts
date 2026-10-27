import { describe, expect, test } from 'vitest'
import { toPublicRoom } from '@/lib/floors'
import { HALL, STAIR_LEN, footprint, placeRooms, roomKind, supports3d } from '@/lib/room3d/model'
import type { PublicRoom } from '@/types/booking'
import type { Room, Unit } from '@/types/property'

function unit(over: Partial<Unit>): Unit {
  return {
    id: 1,
    room_id: 9,
    kind: 'bedspace',
    label: 'Bed 1',
    sort_order: 0,
    capacity: 1,
    status: 'available',
    status_label: 'Available',
    not_ready: false,
    not_ready_reason: null,
    rent_centavos: 180000,
    upcoming_rent: null,
    tenant_name: null,
    is_whole_option: false,
    blocked: false,
    reservation: null,
    ...over,
  }
}

function ownerRoom(units: Unit[], over: Partial<Room> = {}): Room {
  return {
    id: 9,
    property_id: 3,
    code: 'F2-01',
    number: 1,
    floor: 2,
    door_no: '2A',
    label: '2A',
    who_can_stay: 'female',
    who_can_stay_label: 'Female only',
    rental_mode: 'bedspaces',
    rental_mode_label: 'By bedspace',
    let_whole: false,
    counts: { units: units.length, available: 0 },
    units,
    ...over,
  }
}

describe("owner's preview", () => {
  test('an owner room reads like the public listing: free places, lowest free rent, whole-room option', () => {
    const r = toPublicRoom(
      ownerRoom([
        unit({ id: 1, status: 'occupied', rent_centavos: 150000 }),
        unit({ id: 2, rent_centavos: 180000 }),
        unit({ id: 3, rent_centavos: 170000, not_ready: true }),
        unit({ id: 4, kind: 'whole', is_whole_option: true, capacity: 3, rent_centavos: 500000, blocked: true }),
      ]),
    )
    expect(r).toMatchObject({
      label: '2A',
      floor: 2,
      status: 'available',
      available: 1,
      total: 3,
      capacity: 3,
      rent_from_centavos: 180000,
      availability_label: '1 of 3 bedspaces available',
      whole_option: { available: false, rent_centavos: 500000, capacity: 3 },
    })
  })

  test('a whole room nobody can take yet is "not ready"; a taken one is full', () => {
    const notReady = toPublicRoom(ownerRoom([unit({ kind: 'whole', capacity: 2, not_ready: true })], { rental_mode: 'whole' }))
    expect(notReady).toMatchObject({ status: 'not_ready', capacity: 2, availability_label: 'Whole room for up to 2' })
    const taken = toPublicRoom(ownerRoom([unit({ kind: 'whole', capacity: 2, status: 'occupied' })], { rental_mode: 'whole' }))
    expect(taken.status).toBe('full')
  })
})

function room(over: Partial<PublicRoom>): PublicRoom {
  return {
    id: 1,
    label: '1A',
    code: '1A',
    door_no: '1A',
    floor: 1,
    rental_mode: 'bedspaces',
    rental_mode_label: 'Bedspaces',
    who_can_stay: 'any',
    who_can_stay_label: 'Anyone',
    status: 'available',
    available: 2,
    total: 4,
    capacity: 4,
    rent_from_centavos: 180000,
    availability_label: '2 of 4 bedspaces available',
    whole_option: null,
    ...over,
  }
}

describe('room3d model', () => {
  test('bedspace rooms get bunks by bed count; whole rooms follow the room type', () => {
    expect(roomKind(room({ total: 2 }))).toBe('bunk2')
    expect(roomKind(room({ total: 4 }))).toBe('bunk4')
    expect(roomKind(room({ total: 6 }))).toBe('bunk4')
    expect(roomKind(room({ rental_mode: 'whole', capacity: 1 }))).toBe('solo')
    expect(roomKind(room({ rental_mode: 'whole', capacity: 2 }))).toBe('bunk2')
    expect(roomKind(room({ rental_mode: 'whole', capacity: 3 }))).toBe('family')
  })

  test('rooms go in code order: first half above the hallway, the rest below', () => {
    const rooms = [
      room({ id: 3, code: '1C' }),
      room({ id: 1, code: '1A' }),
      room({ id: 2, code: '1B', rental_mode: 'whole', capacity: 4 }),
    ]
    const fp = footprint([rooms])
    const placed = placeRooms(rooms, fp)

    expect(placed.map((p) => [p.room.code, p.x, p.z])).toEqual([
      ['1A', 0, 0],
      ['1B', 4, 0],
      ['1C', 0, 5 + HALL],
    ])
    // the family-size room (6 × 5 m) sets the length and the top row's depth
    expect(fp).toEqual({ length: 10, depthTop: 5, depthBottom: 4, width: 10 + STAIR_LEN, depth: 5 + HALL + 4 })
  })

  test('the footprint fits the widest floor, so floors stack', () => {
    const one = [room({ code: '1A' }), room({ code: '1B' })]
    const two = [room({ code: '2A' }), room({ code: '2B' }), room({ code: '2C' }), room({ code: '2D' })]
    expect(footprint([one, two]).length).toBe(8)
  })

  test('jsdom has no WebGL, so the flat views are used', () => {
    expect(supports3d()).toBe(false)
  })
})
