import type { PublicRoom } from '@/types/booking'
import type { WhoCanStay } from '@/types/enums'
import type { Room, Unit } from '@/types/property'

// ---------- Owner rooms as boarders see them ----------

/** True when a bed or room can be taken now (same rule as the API) */
const isUnitFree = (u: Unit) => u.status === 'available' && !u.not_ready && !u.blocked

/** Turns an owner's room into the room boarders see on the listing. */
export function toPublicRoom(room: Room): PublicRoom {
  const option = room.units.find((u) => u.is_whole_option) ?? null
  const units = room.units.filter((u) => !u.is_whole_option)
  const free = units.filter(isUnitFree)
  const status: PublicRoom['status'] =
    free.length || (option && isUnitFree(option)) ? 'available' : units.some((u) => u.status === 'available' && u.not_ready) ? 'not_ready' : 'full'
  const rents = (free.length ? free : units).map((u) => u.rent_centavos).filter((r): r is number => r !== null)
  const whole = room.rental_mode === 'whole'
  const capacity = whole ? (units[0]?.capacity ?? 0) : units.length
  return {
    id: room.id,
    label: room.label,
    code: room.code,
    door_no: room.door_no,
    floor: room.floor,
    rental_mode: room.rental_mode,
    rental_mode_label: room.rental_mode_label,
    who_can_stay: room.who_can_stay,
    who_can_stay_label: room.who_can_stay_label,
    status,
    available: free.length,
    total: units.length,
    capacity,
    rent_from_centavos: rents.length ? Math.min(...rents) : null,
    availability_label: whole ? `Whole room for up to ${capacity}` : `${free.length} of ${units.length} bedspaces available`,
    whole_option: option ? { available: isUnitFree(option), rent_centavos: option.rent_centavos, capacity: option.capacity } : null,
  }
}

// ---------- Filters ----------

/** The filters in Rooms & availability */
export interface RoomFilters {
  /** Bedspace, whole room, or both */
  kind: 'any' | 'bedspace' | 'whole'
  /** Who can stay */
  who: WhoCanStay
  /** Show only rooms with space */
  availableOnly: boolean
  /** Lowest and highest rent, in centavos (null means no limit) */
  minRent: number | null
  maxRent: number | null
}

export const defaultRoomFilters = (): RoomFilters => ({ kind: 'any', who: 'any', availableOnly: true, minRent: null, maxRent: null })

/** The rent to check against the price range. Uses the whole-room price when looking for whole rooms. */
export function rentFor(room: PublicRoom, kind: RoomFilters['kind']): number | null {
  if (kind === 'whole' && room.rental_mode === 'bedspaces') return room.whole_option?.rent_centavos ?? null
  return room.rent_from_centavos
}

/** True when the rent is in the price range. Rooms with no rent set are kept. */
export function inPriceRange(room: PublicRoom, f: RoomFilters): boolean {
  const rent = rentFor(room, f.kind)
  if (rent === null) return true
  return (f.minRent === null || rent >= f.minRent) && (f.maxRent === null || rent <= f.maxRent)
}

// ---------- Floors ----------

/** One floor and the rooms on it */
export interface FloorSummary {
  key: string
  floor: number | null
  label: string
  /** Rooms that match the filters */
  rooms: PublicRoom[]
  /** Every room on the floor */
  allRooms: PublicRoom[]
  /** How many rooms the floor has */
  totalRooms: number
  /** Matching rooms with space */
  freeRooms: number
  /** Free beds in those rooms */
  freeBeds: number
  /** Has matching rooms, but all are full */
  isFull: boolean
}

export function floorName(floor: number | null): string {
  if (floor === null) return 'No floor set'
  if (floor === 0) return 'Ground floor'
  if (floor < 0) return `Basement ${-floor}`
  const suffix = floor % 100 >= 11 && floor % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[floor % 10] ?? 'th'
  return `${floor}${suffix} floor`
}

/** Short floor name, like 1F, G or B1 */
export function floorShort(floor: number | null): string {
  if (floor === null) return 'No floor'
  if (floor === 0) return 'G'
  return floor < 0 ? `B${-floor}` : `${floor}F`
}

/** Text for a floor tab, like "2F · 3 free" */
export function floorTabText(summary: FloorSummary): string {
  const state = summary.freeRooms ? `${summary.freeRooms} free` : summary.rooms.length || summary.isFull ? 'full' : 'no match'
  return `${floorShort(summary.floor)} · ${state}`
}

// ---------- Rooms ----------

/** Text for a room's status, like "2 of 4 free" */
export function roomStatusText(room: PublicRoom): string {
  if (room.status === 'not_ready') return 'Not ready'
  if (room.rental_mode === 'bedspaces') {
    const beds = room.available ? `${room.available} of ${room.total} free` : 'Full'
    return room.whole_option?.available ? `${beds} · or whole` : beds
  }
  return room.available ? `Free · up to ${room.capacity}` : 'Taken'
}

/** True when the room has space for what the boarder wants */
export function isFreeFor(room: PublicRoom, kind: RoomFilters['kind']): boolean {
  const freeWhole = (room.rental_mode === 'whole' && room.available > 0) || !!room.whole_option?.available
  const freeBed = room.rental_mode === 'bedspaces' && room.available > 0
  if (kind === 'bedspace') return freeBed
  if (kind === 'whole') return freeWhole
  return freeBed || freeWhole
}

/** True when the room matches the filters */
export function matchesFilters(room: PublicRoom, f: RoomFilters): boolean {
  if (f.kind === 'bedspace' && room.rental_mode !== 'bedspaces') return false
  if (f.kind === 'whole' && room.rental_mode !== 'whole' && !room.whole_option) return false
  // Same as the Find page: rooms for that group or for anyone
  if (f.who !== 'any' && room.who_can_stay !== f.who && room.who_can_stay !== 'any') return false
  if (!inPriceRange(room, f)) return false
  return !f.availableOnly || isFreeFor(room, f.kind)
}

/** Lists the floors from the top down, with rooms that have no floor last. */
export function floorSummaries(rooms: PublicRoom[], f: RoomFilters): FloorSummary[] {
  const byFloor = new Map<string, FloorSummary>()
  for (const room of rooms) {
    const key = room.floor === null ? 'none' : String(room.floor)
    if (!byFloor.has(key)) {
      byFloor.set(key, { key, floor: room.floor, label: floorName(room.floor), rooms: [], allRooms: [], totalRooms: 0, freeRooms: 0, freeBeds: 0, isFull: false })
    }
    const summary = byFloor.get(key)!
    summary.totalRooms++
    summary.allRooms.push(room)
    if (!matchesFilters(room, f)) {
      if (matchesFilters(room, { ...f, availableOnly: false })) summary.isFull = true
      continue
    }
    summary.rooms.push(room)
    if (isFreeFor(room, f.kind)) summary.freeRooms++
    if (room.rental_mode === 'bedspaces' && f.kind !== 'whole') summary.freeBeds += room.available
  }
  return [...byFloor.values()].sort((a, b) => (b.floor ?? -Infinity) - (a.floor ?? -Infinity))
}

/** Text for what is free on a floor, like "2 rooms free · 5 beds" */
export function floorFreeText(summary: FloorSummary): string {
  if (!summary.freeRooms) return summary.rooms.length || summary.isFull ? 'Full' : 'No match'
  const rooms = `${summary.freeRooms} ${summary.freeRooms === 1 ? 'room' : 'rooms'} free`
  return summary.freeBeds ? `${rooms} · ${summary.freeBeds} ${summary.freeBeds === 1 ? 'bed' : 'beds'}` : rooms
}

/** The room type: Bedspace, Solo (1 person), Whole room (2) or Family (3 or more) */
export function roomType(room: PublicRoom): 'Bedspace' | 'Solo' | 'Whole room' | 'Family' {
  if (room.rental_mode === 'bedspaces') return 'Bedspace'
  if (room.capacity <= 1) return 'Solo'
  return room.capacity >= 3 ? 'Family' : 'Whole room'
}

/** One dot per bed, free beds first */
export function bedDots(room: PublicRoom): boolean[] {
  if (room.rental_mode !== 'bedspaces') return []
  return Array.from({ length: room.total }, (_, i) => i < room.available)
}

/** How wide a room is on the flat floor plan */
export function roomWeight(room: PublicRoom): number {
  const people = room.rental_mode === 'bedspaces' ? room.total : room.capacity
  return Math.min(3, Math.max(1, Math.ceil(people / 2)))
}

/** Splits the rooms for the flat floor plan: first half above the hallway, the rest below. */
export function autoLayout(rooms: PublicRoom[]): { top: PublicRoom[]; bottom: PublicRoom[] } {
  const ordered = [...rooms].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
  const half = Math.ceil(ordered.length / 2)
  return { top: ordered.slice(0, half), bottom: ordered.slice(half) }
}

/** "3 slots" on a map pin: free bedspaces and whole rooms at a place. */
export function slotsText(available: number): string {
  return `${available} ${available === 1 ? 'slot' : 'slots'}`
}
