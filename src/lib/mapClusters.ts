/** Where a place is on the screen, in pixels */
export interface ScreenPoint {
  id: number
  x: number
  y: number
}

/** Places shown together as one pin */
export interface Cluster {
  ids: number[]
  x: number
  y: number
}

/** How close pins can be side by side before they overlap (pixels) */
export const CLUSTER_PX = 56
/** How close pins can be up and down before they overlap (pixels) */
export const CLUSTER_PX_TALL = 82

/** From this zoom, pins are no longer grouped; pins on the same spot spread out */
export const FAN_OUT_ZOOM = 18

/** Groups places whose pins would overlap */
export function clusterPoints(points: ScreenPoint[], widthPx = CLUSTER_PX, heightPx = CLUSTER_PX_TALL): Cluster[] {
  const groups: { ids: number[]; sumX: number; sumY: number }[] = []
  for (const p of points) {
    const near = groups.find(
      (g) => Math.abs(g.sumX / g.ids.length - p.x) < widthPx && Math.abs(g.sumY / g.ids.length - p.y) < heightPx,
    )
    if (near) {
      near.ids.push(p.id)
      near.sumX += p.x
      near.sumY += p.y
    } else {
      groups.push({ ids: [p.id], sumX: p.x, sumY: p.y })
    }
  }
  return groups.map((g) => ({ ids: g.ids, x: g.sumX / g.ids.length, y: g.sumY / g.ids.length }))
}

/** Spreads pins on the same spot into a circle */
export function fanOutOffsets(count: number, radiusPx = CLUSTER_PX * 0.75): { x: number; y: number }[] {
  if (count <= 1) return [{ x: 0, y: 0 }]
  // Make the circle big enough so pins don't touch
  const ring = Math.max(radiusPx, CLUSTER_PX_TALL / (2 * Math.sin(Math.PI / count)))
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count
    return { x: Math.round(ring * Math.cos(angle)), y: Math.round(ring * Math.sin(angle)) }
  })
}
