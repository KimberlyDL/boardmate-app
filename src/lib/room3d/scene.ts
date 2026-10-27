import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { FLOOR_H, HALL, STAIR_LEN, type Footprint, type PlacedRoom, type RoomKind, type RoomShape, footprint, placeRooms, roomKind } from '@/lib/room3d/model'
import type { PublicRoom } from '@/types/booking'

/* Builds the 3D rooms, floors and building, and draws them on screen. */
THREE.ColorManagement.enabled = false

type Palette = Record<string, number>
type Parent = THREE.Object3D

const ROOM = 4
const T = 0.12
const WALL_H = 2.7
/** Where the inside of the back and left walls is */
const IN = -ROOM / 2 + T
const PORCELAIN = 0xf4f6f6
const CHROME = 0xb8c0c4

// ---------- Building blocks ----------
const mats = new Map<number, THREE.MeshLambertMaterial>()
// Draw both sides, so cut walls don't look hollow
const mat = (c: number) => {
  let m = mats.get(c)
  if (!m) mats.set(c, (m = new THREE.MeshLambertMaterial({ color: c, side: THREE.DoubleSide })))
  return m
}
const edgeMat = new THREE.LineBasicMaterial({ color: 0x1d2524, transparent: true, opacity: 0.16 })

function box(p: Parent, w: number, h: number, d: number, c: number | THREE.Material, x: number, y: number, z: number, edges = true) {
  const g = new THREE.BoxGeometry(w, h, d)
  const m = new THREE.Mesh(g, typeof c === 'number' ? mat(c) : c)
  m.position.set(x, y + h / 2, z)
  if (edges) m.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), edgeMat))
  p.add(m)
  return m
}
function blob(p: Parent, sx: number, sy: number, sz: number, c: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), mat(c))
  m.scale.set(sx, sy, sz)
  m.position.set(x, y, z)
  p.add(m)
  return m
}
function cyl(p: Parent, r: number, h: number, c: number, x: number, y: number, z: number, rx = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), mat(c))
  m.position.set(x, y, z)
  m.rotation.x = rx
  p.add(m)
  return m
}

/** A group for things on a wall (x goes along the wall, z goes into the room). */
function wallGroup(p: Parent, side: 'back' | 'left') {
  const g = new THREE.Group()
  if (side === 'back') g.position.set(0, 0, IN)
  else {
    g.position.set(IN, 0, 0)
    g.rotation.y = Math.PI / 2
  }
  p.add(g)
  return g
}

/** The room's floor and its back and left walls. */
function shell(p: Parent, P: Palette, xMax = ROOM / 2, zMax = ROOM / 2) {
  const W = xMax + ROOM / 2
  const D = zMax + ROOM / 2
  const cx = (xMax - ROOM / 2) / 2
  const cz = (zMax - ROOM / 2) / 2
  box(p, W, 0.14, D, P.base, cx, -0.14, cz)
  box(p, W - T, 0.02, D - T, P.floor, cx + T / 2, -0.02, cz + T / 2, false)
  box(p, W, WALL_H, T, P.wall, cx, 0, -ROOM / 2 + T / 2)
  box(p, T, WALL_H, D - T, P.wall2, -ROOM / 2 + T / 2, 0, cz + T / 2)
  box(p, W - T, 0.1, 0.03, P.base, cx + T / 2, 0, IN + 0.015)
  box(p, 0.03, 0.1, D - T - 0.03, P.base, IN + 0.015, 0, cz + T / 2 + 0.015)
}

function windowOn(wg: Parent, x: number, P: Palette, plant: boolean) {
  const w = 0.9
  box(wg, w + 0.1, 1.12, 0.06, P.wood, x, 0.94, 0.03)
  box(wg, w, 1.0, 0.02, P.glass, x, 1.0, 0.065, false)
  box(wg, 0.04, 1.0, 0.03, P.wood, x, 1.0, 0.07)
  box(wg, w, 0.04, 0.03, P.wood, x, 1.5, 0.07)
  box(wg, w + 0.24, 0.04, 0.14, P.wood, x, 0.92, 0.07)
  box(wg, w + 0.7, 0.03, 0.03, P.woodDark, x, 2.14, 0.1)
  for (const s of [-1, 1]) box(wg, 0.22, 1.2, 0.05, P.curtain, x + s * (w / 2 + 0.1), 0.92, 0.12)
  if (plant) {
    cyl(wg, 0.06, 0.1, P.pot, x + 0.25, 1.01, 0.08)
    blob(wg, 0.09, 0.1, 0.07, 0x5f9e5b, x + 0.25, 1.13, 0.08)
  }
}

interface Placement {
  x: number
  z: number
  rot: number
  /** Which end the pillows are on (+1 or -1) */
  head: number
}

function bunk(p: Parent, { x, z, rot, head }: Placement, P: Palette) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  g.rotation.y = rot
  p.add(g)
  const L = 2.0
  const W = 0.95
  const H = 1.82
  const t = 0.07
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, t, H, t, P.wood, sx * (L / 2 - t / 2), 0, sz * (W / 2 - t / 2))
  const levels: [number, number, number][] = [
    [0.18, P.lower, P.pillowLow],
    [1.12, P.upper, P.pillowUp],
  ]
  for (const [y, blanket, pillow] of levels) {
    for (const sz of [-1, 1]) box(g, L, 0.16, 0.04, P.wood, 0, y, sz * (W / 2 - 0.02))
    for (const sx of [-1, 1]) box(g, 0.04, 0.16, W, P.wood, sx * (L / 2 - 0.02), y, 0)
    box(g, L - 0.1, 0.17, W - 0.1, P.sheet, 0, y + 0.13, 0)
    const top = y + 0.3
    box(g, L * 0.62, 0.06, W - 0.04, blanket, -head * (L / 2 - L * 0.31 - 0.04), top - 0.03, 0)
    box(g, 0.12, 0.065, W - 0.03, P.sheet, -head * (L / 2 - L * 0.62 - 0.1), top - 0.03, 0)
    box(g, 0.34, 0.11, W * 0.36, pillow, head * (L / 2 - 0.25), top, -W * 0.2)
    box(g, 0.34, 0.11, W * 0.36, P.pillowAlt, head * (L / 2 - 0.25), top, W * 0.2)
  }
  // Top bunk sides and guard rails
  for (const sx of [-1, 1]) box(g, 0.04, 0.32, W - 0.1, P.wood, sx * (L / 2 - 0.02), 1.42, 0)
  box(g, L, 0.05, 0.04, P.wood, 0, 1.66, -(W / 2 - 0.02))
  box(g, L - 0.55, 0.05, 0.04, P.wood, head * 0.275, 1.66, W / 2 - 0.02)
  // Ladder
  const xa = -head * (L / 2 - 0.1)
  const xb = -head * (L / 2 - 0.46)
  const lz = W / 2 + 0.04
  box(g, 0.045, 1.72, 0.045, P.wood, xa, 0, lz)
  box(g, 0.045, 1.72, 0.045, P.wood, xb, 0, lz)
  for (let y = 0.5; y < 1.6; y += 0.28) box(g, Math.abs(xa - xb), 0.035, 0.04, P.woodDark, (xa + xb) / 2, y, lz)
}

function bed(p: Parent, { x, z, rot, head }: Placement, P: Palette, W = 1.0) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  g.rotation.y = rot
  p.add(g)
  const L = 2.0
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, 0.06, 0.14, 0.06, P.woodDark, sx * (L / 2 - 0.06), 0, sz * (W / 2 - 0.06))
  box(g, L, 0.2, W, P.wood, 0, 0.12, 0)
  box(g, L - 0.06, 0.2, W - 0.06, P.sheet, 0, 0.32, 0)
  box(g, 0.08, 0.95, W + 0.04, P.wood, head * (L / 2 + 0.02), 0, 0)
  box(g, L * 0.62, 0.07, W + 0.02, P.lower, -head * (L / 2 - L * 0.31 - 0.02), 0.48, 0)
  box(g, 0.14, 0.075, W + 0.03, P.sheet, -head * (L / 2 - L * 0.62 - 0.1), 0.48, 0)
  box(g, 0.3, 0.08, W + 0.04, P.pillowAlt, -head * (L / 2 - 0.2), 0.48, 0)
  for (const s of [-1, 1]) box(g, 0.36, 0.13, W * 0.42, P.pillowLow, head * (L / 2 - 0.26), 0.52, s * W * 0.22)
}

/** A wardrobe. Its doors face +x before it is turned. */
function wardrobe(p: Parent, x: number, z: number, P: Palette, rot = 0) {
  const g = new THREE.Group()
  g.position.set(x, 0, z)
  g.rotation.y = rot
  p.add(g)
  box(g, 0.55, 1.95, 1.0, P.wood, 0, 0, 0)
  for (const s of [-1, 1]) {
    box(g, 0.02, 1.8, 0.47, P.woodLight, 0.285, 0.08, s * 0.245)
    box(g, 0.025, 0.18, 0.02, P.woodDark, 0.3, 0.95, s * 0.05)
  }
}

function desk(p: Parent, x: number, z: number, P: Palette) {
  box(p, 1.3, 0.05, 0.6, P.wood, x, 0.72, z)
  box(p, 0.42, 0.72, 0.56, P.wood, x + 0.42, 0, z)
  for (const y of [0.42, 0.62]) box(p, 0.36, 0.005, 0.01, P.woodDark, x + 0.42, y, z + 0.285, false)
  box(p, 0.05, 0.72, 0.05, P.wood, x - 0.6, 0, z - 0.25)
  box(p, 0.05, 0.72, 0.05, P.wood, x - 0.6, 0, z + 0.25)
  box(p, 0.04, 0.16, 0.04, 0x3b3f44, x - 0.05, 0.78, z - 0.16)
  box(p, 0.6, 0.36, 0.03, 0x2b2f34, x - 0.05, 0.92, z - 0.16)
  box(p, 0.55, 0.31, 0.005, P.screen, x - 0.05, 0.945, z - 0.143, false)
  box(p, 0.42, 0.02, 0.14, 0xeceae6, x - 0.08, 0.77, z + 0.08)
}

function chair(p: Parent, x: number, z: number) {
  const c = 0x2c3034
  cyl(p, 0.025, 0.36, 0x9aa0a6, x, 0.24, z)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    box(p, 0.3, 0.035, 0.05, c, x + Math.cos(a) * 0.14, 0.05, z + Math.sin(a) * 0.14).rotation.y = -a
  }
  box(p, 0.48, 0.07, 0.46, c, x, 0.42, z)
  box(p, 0.46, 0.52, 0.06, c, x, 0.55, z + 0.24).rotation.x = 0.08
}

function nightstand(p: Parent, x: number, z: number, P: Palette) {
  box(p, 0.45, 0.52, 0.45, P.wood, x, 0, z)
  box(p, 0.22, 0.04, 0.16, 0xc94b3c, x, 0.52, z)
  box(p, 0.2, 0.035, 0.15, 0x3f9b62, x + 0.01, 0.56, z)
}

function rug(p: Parent, w: number, d: number, x: number, z: number, P: Palette) {
  box(p, w, 0.015, d, P.rug, x, 0, z, false)
  box(p, w - 0.3, 0.02, d - 0.3, P.rugIn, x, 0, z, false)
}

function poster(wg: Parent, x: number, y: number, w: number, h: number, frame: number, fill: number) {
  box(wg, w, h, 0.03, frame, x, y, 0.015)
  box(wg, w - 0.06, h - 0.06, 0.01, fill, x, y + 0.03, 0.035, false)
}

function locker(p: Parent, x: number, P: Palette) {
  box(p, 0.56, 1.9, 0.5, P.wood, x, 0, IN + 0.25)
  box(p, 0.48, 1.76, 0.02, P.woodLight, x, 0.07, IN + 0.51)
  box(p, 0.02, 0.16, 0.025, P.woodDark, x + 0.18, 0.95, IN + 0.53)
}

function floorLamp(p: Parent, x: number, z: number) {
  cyl(p, 0.14, 0.03, 0x3b3f44, x, 0.015, z)
  cyl(p, 0.015, 1.4, 0x3b3f44, x, 0.72, z)
  cyl(p, 0.17, 0.25, 0xf3ead6, x, 1.5, z)
}

function bigPlant(p: Parent, x: number, z: number) {
  cyl(p, 0.17, 0.34, 0xc47a55, x, 0.17, z)
  blob(p, 0.26, 0.38, 0.26, 0x5f9e5b, x, 0.7, z)
  blob(p, 0.18, 0.26, 0.18, 0x6fae66, x + 0.08, 1.02, z - 0.05)
}

// ---------- Family room pieces ----------
function kitchenette(p: Parent, z0: number, z1: number, P: Palette) {
  const d = 0.6
  const len = z1 - z0
  const cz = (z0 + z1) / 2
  box(p, d, 0.86, len, P.cabinet, IN + d / 2, 0, cz)
  box(p, d + 0.04, 0.04, len + 0.02, P.counter, IN + (d + 0.04) / 2, 0.86, cz)
  box(p, 0.38, 0.012, 0.45, CHROME, IN + 0.32, 0.9, z0 + 0.4, false)
  box(p, 0.03, 0.2, 0.03, CHROME, IN + 0.08, 0.9, z0 + 0.4)
  box(p, 0.5, 0.012, 0.5, 0x26292c, IN + 0.32, 0.9, z1 - 0.35, false)
  box(p, 0.35, 0.6, len, P.cabinet, IN + 0.175, 1.5, cz)
  // Fridge with a microwave on top
  const fx = IN + 0.33
  box(p, 0.65, 1.75, 0.65, 0xe9ecee, fx, 0, z1 + 0.35)
  box(p, 0.03, 0.35, 0.03, CHROME, fx + 0.34, 1.25, z1 + 0.57)
  box(p, 0.38, 0.26, 0.5, 0x3b3f44, fx, 1.75, z1 + 0.35)
}

function diningSet(p: Parent, x: number, z: number, P: Palette) {
  box(p, 1.1, 0.05, 0.8, P.wood, x, 0.71, z)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      box(p, 0.06, 0.71, 0.06, P.woodDark, x + sx * 0.48, 0, z + sz * 0.33)
      const cx = x + sx * 0.27
      const cz = z + sz * 0.58
      box(p, 0.42, 0.05, 0.42, P.woodLight, cx, 0.43, cz)
      for (const lx of [-1, 1]) for (const lz of [-1, 1]) box(p, 0.04, 0.43, 0.04, P.woodDark, cx + lx * 0.18, 0, cz + lz * 0.18)
      box(p, 0.42, 0.42, 0.04, P.woodLight, cx, 0.48, cz + sz * 0.19)
    }
  }
  cyl(p, 0.15, 0.06, PORCELAIN, x, 0.79, z)
}

function sofa(p: Parent, x: number, z: number, P: Palette) {
  box(p, 1.9, 0.42, 0.85, P.sofa, x, 0.06, z)
  box(p, 1.9, 0.45, 0.22, P.sofa, x, 0.48, z + 0.315)
  for (const s of [-1, 1]) {
    box(p, 0.2, 0.22, 0.85, P.sofa, x + s * 0.85, 0.48, z)
    box(p, 0.72, 0.1, 0.6, P.sofaLight, x + s * 0.37, 0.48, z - 0.08)
  }
}

function tvConsole(p: Parent, x: number, z: number, P: Palette) {
  box(p, 1.5, 0.45, 0.42, P.wood, x, 0, z)
  box(p, 0.3, 0.03, 0.18, 0x2b2f34, x, 0.45, z - 0.02)
  box(p, 1.15, 0.66, 0.05, 0x2b2f34, x, 0.56, z - 0.04)
  box(p, 1.09, 0.6, 0.005, P.screen, x, 0.59, z - 0.012, false)
}

// ---------- Room models ----------
const PALETTES: Record<RoomKind, Palette> = {
  solo: {
    wall: 0xdfe3d6, wall2: 0xd2d7c8, floor: 0xe6dccb, base: 0xa59c8c,
    wood: 0xc99a68, woodDark: 0x9c7146, woodLight: 0xd8ae80,
    sheet: 0xf5f2ec, lower: 0x8fae8b, upper: 0x8fae8b,
    pillowLow: 0xf0e6d2, pillowUp: 0xf0e6d2, pillowAlt: 0xd9a841,
    glass: 0xd6eaf0, curtain: 0xe9dfc9, pot: 0xc47a55,
    rug: 0xd8cdb8, rugIn: 0xb7c4a8, screen: 0x4a6c8a, beanbag: 0xd9a841,
  },
  bunk2: {
    wall: 0xd3cec8, wall2: 0xc6c0b9, floor: 0xe2dbd0, base: 0x9d968c,
    wood: 0xd59d55, woodDark: 0xae7a3a, woodLight: 0xe1b16f,
    sheet: 0xf3f0ea, lower: 0xf1c94a, upper: 0x3a9ac3,
    pillowLow: 0xf5d35b, pillowUp: 0x2c7fa8, pillowAlt: 0x2f86b0,
    glass: 0xcfe7f2, curtain: 0x8cc4de, pot: 0xd0704e,
    rug: 0xc3b7a6, rugIn: 0x928878, screen: 0x4a6c8a, beanbag: 0x49acd3,
  },
  bunk4: {
    wall: 0xf0e0d8, wall2: 0xe6d3ca, floor: 0xf0d8bc, base: 0xcfb597,
    wood: 0xedd2a0, woodDark: 0xc9a46a, woodLight: 0xf5e1bb,
    sheet: 0xf6f2ec, lower: 0x4b9aa3, upper: 0x4b9aa3,
    pillowLow: 0xe8e3dc, pillowUp: 0xe8e3dc, pillowAlt: 0xd8d2ca,
    glass: 0xd8ecf4, curtain: 0xf4ece4, pot: 0xc98b6a,
    rug: 0xf7f1ea, rugIn: 0xefd6dc, screen: 0x4a6c8a,
  },
  family: {
    wall: 0xe9e1d3, wall2: 0xddd3c2, floor: 0xd9c2a0, base: 0x8f7c64,
    wood: 0xb88a5a, woodDark: 0x8a6339, woodLight: 0xc99d6d,
    sheet: 0xf6f3ee, lower: 0x5d7fa6, upper: 0xe08a5b,
    pillowLow: 0xf0e8dc, pillowUp: 0xf4cf6a, pillowAlt: 0xe7dccb,
    glass: 0xd6eaf0, curtain: 0xc9d6e3, pot: 0xc47a55,
    rug: 0xcdbfa8, rugIn: 0x9fb4c8, screen: 0x2f4a66,
    cabinet: 0xf2efe8, counter: 0x8f8a84, sofa: 0x7d93ad, sofaLight: 0x93a7be,
  },
}

/** Builds each room model. Every room starts from its back-left corner. */
const BUILD: Record<RoomKind, (p: Parent) => void> = {
  solo(p) {
    const P = PALETTES.solo
    shell(p, P)
    const back = wallGroup(p, 'back')
    windowOn(back, 0.2, P, true)
    rug(p, 1.8, 1.5, 0.45, 0.45, P)
    bed(p, { x: IN + 0.54, z: -0.82, rot: Math.PI / 2, head: 1 }, P)
    nightstand(p, -0.57, IN + 0.25, P)
    desk(p, 1.22, IN + 0.31, P)
    chair(p, 1.12, -0.98)
    poster(back, 1.25, 1.38, 0.42, 0.5, 0x2f3438, 0x2f3438)
    wardrobe(p, IN + 0.28, 1.3, P)
    blob(p, 0.42, 0.26, 0.4, P.beanbag, 1.25, 0.26, 1.25)
    floorLamp(p, 1.75, 1.7)
  },
  bunk2(p) {
    const P = PALETTES.bunk2
    shell(p, P)
    const back = wallGroup(p, 'back')
    windowOn(back, -0.05, P, true)
    rug(p, 1.9, 1.45, 0.35, 0.55, P)
    bunk(p, { x: IN + 0.5, z: -0.85, rot: Math.PI / 2, head: 1 }, P)
    nightstand(p, IN + 0.25, 0.58, P)
    desk(p, 1.22, IN + 0.31, P)
    chair(p, 1.12, -0.98)
    poster(wallGroup(p, 'left'), -0.6, 1.15, 0.5, 0.42, 0xf3f0ea, 0xe9e2d6)
    blob(p, 0.44, 0.27, 0.42, P.beanbag, IN + 0.62, 0.27, 1.45)
  },
  bunk4(p) {
    const P = PALETTES.bunk4
    shell(p, P)
    windowOn(wallGroup(p, 'back'), 0, P, true)
    rug(p, 1.35, 2.0, 0.05, 0.55, P)
    bunk(p, { x: IN + 0.5, z: -0.32, rot: Math.PI / 2, head: 1 }, P)
    bunk(p, { x: 1.45, z: -0.32, rot: -Math.PI / 2, head: -1 }, P)
    for (const x of [-1.57, -0.99, 1.0, 1.58]) locker(p, x, P)
  },
  family(p) {
    const P = PALETTES.family
    shell(p, P, 4, 3)
    windowOn(wallGroup(p, 'left'), -0.3, P, false)
    rug(p, 2.4, 1.9, 2.2, 1.55, P)
    nightstand(p, -1.62, IN + 0.25, P)
    bed(p, { x: -0.6, z: -0.82, rot: Math.PI / 2, head: 1 }, P, 1.5)
    nightstand(p, 0.42, IN + 0.25, P)
    bunk(p, { x: 1.9, z: IN + 0.5, rot: 0, head: -1 }, P)
    wardrobe(p, 3.42, IN + 0.28, P, -Math.PI / 2)
    kitchenette(p, 1.0, 2.3, P)
    diningSet(p, -0.25, 2.05, P)
    tvConsole(p, 2.2, 0.55, P)
    sofa(p, 2.2, 2.45, P)
    bigPlant(p, 3.6, 0.2)
  },
}

// ---------- Scenes ----------

/** Where a floor or room label goes in the 3D view. */
export interface Tag3D {
  id: string
  pos: THREE.Vector3
}

/** A ready-to-show 3D scene. */
export interface Built {
  group: THREE.Group
  /** Width, depth and height */
  size: { w: number; d: number; h: number }
  /** The point the camera looks at */
  center: THREE.Vector3
  tags: Tag3D[]
  /** Cut off everything above 2 m, like a floor plan */
  cut: boolean
  /** Look from higher up */
  high: boolean
}

function stairs(p: Parent, x0: number, z0: number) {
  const n = 11
  const run = STAIR_LEN / n
  const rise = FLOOR_H / n
  for (let i = 0; i < n; i++) box(p, run, rise * (i + 1), HALL - 0.3, 0xc9c2b6, x0 + run * (i + 0.5), 0, z0 + HALL / 2)
}

/** Builds one floor: the floor, hallway, rooms and stairs. */
function floorGroup(rooms: PublicRoom[], fp: Footprint) {
  const g = new THREE.Group()
  const placed = placeRooms(rooms, fp)
  box(g, fp.width + 0.2, 0.27, fp.depth + 0.2, 0x9d968c, fp.width / 2, -0.3, fp.depth / 2)
  box(g, fp.width, 0.01, fp.depth, 0xe4dfd6, fp.width / 2, -0.03, fp.depth / 2, false)
  box(g, fp.width + 0.12, WALL_H, 0.12, 0xd9d3c9, fp.width / 2 - 0.06, 0, -0.06)
  box(g, 0.12, WALL_H, fp.depth, 0xd9d3c9, -0.06, 0, fp.depth / 2)
  for (const pr of placed) {
    const m = new THREE.Group()
    BUILD[pr.kind](m)
    m.position.set(pr.x + ROOM / 2, 0, pr.z + ROOM / 2)
    g.add(m)
  }
  stairs(g, fp.length, fp.depthTop)
  return { g, placed }
}

/** Joins the pieces together so the phone draws them faster. */
function merge(g: THREE.Object3D) {
  g.updateMatrixWorld(true)
  const byMat = new Map<THREE.Material, THREE.BufferGeometry[]>()
  const lines: THREE.BufferGeometry[] = []
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const list = byMat.get(o.material) ?? []
      list.push(o.geometry.clone().applyMatrix4(o.matrixWorld))
      byMat.set(o.material, list)
    } else if (o instanceof THREE.LineSegments) {
      lines.push(o.geometry.clone().applyMatrix4(o.matrixWorld))
    }
  })
  const out = new THREE.Group()
  byMat.forEach((geos, m) => {
    const merged = mergeGeometries(geos)
    for (const geo of merged ? [merged] : geos) out.add(new THREE.Mesh(geo, m))
    if (merged) geos.forEach((geo) => geo.dispose())
  })
  const mergedLines = lines.length ? mergeGeometries(lines) : null
  if (mergedLines) out.add(new THREE.LineSegments(mergedLines, edgeMat))
  g.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose()
  })
  return out
}

/** Builds the whole building, floor by floor from the bottom. */
export function buildBuilding(floors: { id: string; rooms: PublicRoom[] }[]): Built {
  const fp = footprint(floors.map((f) => f.rooms))
  const group = new THREE.Group()
  const tags: Tag3D[] = []
  floors.forEach((f, i) => {
    const { g } = floorGroup(f.rooms, fp)
    g.position.set(-fp.width / 2, i * FLOOR_H, -fp.depth / 2)
    group.add(merge(g))
    // Put the floor label on the right side
    tags.push({ id: f.id, pos: new THREE.Vector3(fp.width / 2 + 0.5, i * FLOOR_H + 1.2, 0) })
  })
  const h = floors.length * FLOOR_H
  return { group, size: { w: fp.width, d: fp.depth, h }, center: new THREE.Vector3(0, h / 2 - 0.8, 0), tags, cut: false, high: false }
}

/** Builds one floor seen from above, with a label for each room. */
export function buildFloor(rooms: PublicRoom[]): Built {
  const fp = footprint([rooms])
  const { g, placed } = floorGroup(rooms, fp)
  g.position.set(-fp.width / 2, 0, -fp.depth / 2)
  const group = new THREE.Group()
  group.add(merge(g))
  const tags: Tag3D[] = placed.map((p: PlacedRoom) => ({
    id: String(p.room.id),
    pos: new THREE.Vector3(p.x + p.w / 2 - fp.width / 2, 2.2, p.z + p.d / 2 - fp.depth / 2),
  }))
  return { group, size: { w: fp.width, d: fp.depth, h: 0 }, center: new THREE.Vector3(0, 0.9, 0), tags, cut: true, high: true }
}

/** Builds a single room. */
export function buildRoom(room: RoomShape): Built {
  const kind = roomKind(room)
  const g = new THREE.Group()
  BUILD[kind](g)
  const group = new THREE.Group()
  group.add(merge(g))
  const big = kind === 'family'
  const w = big ? 6 : 4
  const d = big ? 5 : 4
  return { group, size: { w, d, h: 0 }, center: new THREE.Vector3((w - 4) / 2 + 0.1, 0.9, (d - 4) / 2), tags: [], cut: false, high: false }
}

// ---------- Renderer ----------

/** Shows a 3D scene. You can zoom in and drag, and it only redraws when something changes. */
export class View3D {
  readonly renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -80, 120)
  private content: Built | null = null
  private zoom = 1
  /** How far the view was dragged */
  private pan = new THREE.Vector3()
  private queued = false
  private cutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 2.0)

  constructor(
    private host: HTMLElement,
    private onDraw: () => void,
  ) {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.renderer = new THREE.WebGLRenderer({ antialias: dpr < 1.5, alpha: true, powerPreference: 'low-power' })
    this.renderer.setPixelRatio(dpr)
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    host.appendChild(this.renderer.domElement)
    // Lights (three.js needs them times PI to look the same as the demo)
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.56 * Math.PI))
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xcbbca6, 0.22 * Math.PI))
    const sun = new THREE.DirectionalLight(0xffffff, 0.5 * Math.PI)
    sun.position.set(6, 10, 4)
    this.scene.add(sun)
  }

  show(built: Built) {
    this.clear()
    this.content = built
    this.scene.add(built.group)
    this.renderer.clippingPlanes = built.cut ? [this.cutPlane] : []
    this.resetZoom()
  }

  /** True when zoomed in past 100% */
  get zoomed() {
    return this.zoom > 1.001
  }

  zoomBy(k: number) {
    this.zoom = Math.min(4, Math.max(0.6, this.zoom * k))
    // Back to normal size, so undo the drag
    if (!this.zoomed) this.pan.set(0, 0, 0)
    this.resize()
    return this.zoom
  }

  resetZoom() {
    this.zoom = 1
    this.pan.set(0, 0, 0)
    this.resize()
  }

  /** Moves the view when dragging, without losing the drawing. */
  panBy(dx: number, dy: number) {
    if (!this.zoomed || !this.content) return
    const perPx = (this.cam.right - this.cam.left) / Math.max(1, this.host.clientWidth)
    const right = new THREE.Vector3().setFromMatrixColumn(this.cam.matrixWorld, 0)
    const up = new THREE.Vector3().setFromMatrixColumn(this.cam.matrixWorld, 1)
    this.pan.addScaledVector(right, -dx * perPx).addScaledVector(up, dy * perPx)
    const { w, d, h } = this.content.size
    const limit = (Math.max(w, d) + h) / 2
    if (this.pan.length() > limit) this.pan.setLength(limit)
    this.aim()
    this.draw()
  }

  private aim() {
    if (!this.content) return
    const { center, high } = this.content
    const look = center.clone().add(this.pan)
    this.cam.position.copy(look).add(high ? new THREE.Vector3(7, 14, 7) : new THREE.Vector3(10, 8.6, 10))
    this.cam.lookAt(look)
    this.cam.updateMatrixWorld()
  }

  /** Fits the drawing to the box it is shown in. */
  resize() {
    const w = this.host.clientWidth
    const h = this.host.clientHeight
    if (!w || !h || !this.content) return
    this.renderer.setSize(w, h)
    const { size, high } = this.content
    const aspect = w / h
    const s = size.w + size.d
    // How much room the drawing needs
    const needH = high ? 0.6 * s + 1.5 : size.h ? 0.38 * s + 0.86 * size.h + 1 : 3 + 0.55 * s
    const needW = (high ? 0.75 : 0.71) * s + 1
    const viewH = Math.max(needH, needW / aspect) * 1.05 / this.zoom
    this.cam.left = (-viewH * aspect) / 2
    this.cam.right = (viewH * aspect) / 2
    this.cam.top = viewH / 2
    this.cam.bottom = -viewH / 2
    this.aim()
    this.cam.updateProjectionMatrix()
    this.draw()
  }

  /** Finds where a 3D point shows up on screen */
  project(p: THREE.Vector3) {
    const v = p.clone().project(this.cam)
    return { x: ((v.x + 1) / 2) * this.host.clientWidth, y: ((1 - v.y) / 2) * this.host.clientHeight }
  }

  draw() {
    if (this.queued) return
    this.queued = true
    requestAnimationFrame(() => {
      this.queued = false
      this.renderer.render(this.scene, this.cam)
      this.onDraw()
    })
  }

  private clear() {
    if (!this.content) return
    this.scene.remove(this.content.group)
    this.content.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose()
    })
    this.content = null
  }

  dispose() {
    this.clear()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
