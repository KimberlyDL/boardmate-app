import { autoLayout } from '@/lib/floors'
import type { PublicRoom } from '@/types/booking'

/** Which 3D room model to show, based on the room's type and size. */
export type RoomKind = 'solo' | 'bunk2' | 'bunk4' | 'family'

export function roomKind(room: PublicRoom): RoomKind {
  if (room.rental_mode === 'bedspaces') return room.total <= 2 ? 'bunk2' : 'bunk4'
  if (room.capacity <= 1) return 'solo'
  return room.capacity >= 3 ? 'family' : 'bunk2'
}

/** How big each room model is, in metres. */
export const ROOM_SIZE: Record<RoomKind, { w: number; d: number }> = {
  solo: { w: 4, d: 4 },
  bunk2: { w: 4, d: 4 },
  bunk4: { w: 4, d: 4 },
  family: { w: 6, d: 5 },
}

export const HALL = 2.4
export const STAIR_LEN = 3.2
/** How tall one floor is */
export const FLOOR_H = 3

/** Where a room sits on its floor, and how big it is. */
export interface PlacedRoom {
  room: PublicRoom
  kind: RoomKind
  x: number
  z: number
  w: number
  d: number
}

/** The size of each floor, the same for all floors. */
export interface Footprint {
  /** Length of the longest row of rooms */
  length: number
  /** Depth of the rooms on each side of the hallway */
  depthTop: number
  depthBottom: number
  /** Size of the whole floor, with the stairs */
  width: number
  depth: number
}

const rowLength = (rooms: PublicRoom[]) => rooms.reduce((s, r) => s + ROOM_SIZE[roomKind(r)].w, 0)
const rowDepth = (rooms: PublicRoom[]) => (rooms.length ? Math.max(...rooms.map((r) => ROOM_SIZE[roomKind(r)].d)) : 4)

/** Works out a floor size big enough for every floor. */
export function footprint(floors: PublicRoom[][]): Footprint {
  let length = 0
  let depthTop = 0
  let depthBottom = 0
  for (const rooms of floors) {
    // Same room order as the flat floor plan
    const { top, bottom } = autoLayout(rooms)
    length = Math.max(length, rowLength(top), rowLength(bottom))
    depthTop = Math.max(depthTop, rowDepth(top))
    depthBottom = Math.max(depthBottom, rowDepth(bottom))
  }
  if (!depthTop) depthTop = 4
  if (!depthBottom) depthBottom = 4
  return { length, depthTop, depthBottom, width: length + STAIR_LEN, depth: depthTop + HALL + depthBottom }
}

/** Places each room on its floor. */
export function placeRooms(rooms: PublicRoom[], fp: Footprint): PlacedRoom[] {
  const { top, bottom } = autoLayout(rooms)
  const placed: PlacedRoom[] = []
  ;[top, bottom].forEach((row, i) => {
    const z = i === 0 ? 0 : fp.depthTop + HALL
    let x = 0
    for (const room of row) {
      const kind = roomKind(room)
      const { w, d } = ROOM_SIZE[kind]
      placed.push({ room, kind, x, z, w, d })
      x += w
    }
  })
  return placed
}

/** Checks if the phone can show 3D. If not, the flat views are used. */
export function supports3d(): boolean {
  if (typeof window === 'undefined' || typeof WebGLRenderingContext === 'undefined') return false
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  if (nav.connection?.saveData) return false
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 2) return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}
