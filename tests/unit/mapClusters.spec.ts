import { describe, expect, test } from 'vitest'
import { CLUSTER_PX, CLUSTER_PX_TALL, clusterPoints, fanOutOffsets } from '@/lib/mapClusters'

describe('clusterPoints', () => {
  test('pins that would overlap become one group at their average; far ones stay alone', () => {
    const groups = clusterPoints([
      { id: 1, x: 100, y: 100 },
      { id: 2, x: 120, y: 110 },
      { id: 3, x: 400, y: 100 },
      { id: 4, x: 110, y: 130 },
    ])

    expect(groups.map((g) => g.ids)).toEqual([[1, 2, 4], [3]])
    expect(groups[0].x).toBeCloseTo(110)
    expect(groups[0].y).toBeCloseTo(113.33, 1)
    expect(groups[1]).toEqual({ ids: [3], x: 400, y: 100 })
  })

  test('exactly one pin-width apart is far enough to stay apart', () => {
    const groups = clusterPoints([
      { id: 1, x: 0, y: 0 },
      { id: 2, x: CLUSTER_PX, y: 0 },
    ])

    expect(groups.map((g) => g.ids)).toEqual([[1], [2]])
  })

  test('pins are taller than wide: one above the other overlaps further apart than side by side', () => {
    const stacked = clusterPoints([
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: CLUSTER_PX + 10 },
    ])
    const apart = clusterPoints([
      { id: 1, x: 0, y: 0 },
      { id: 2, x: 0, y: CLUSTER_PX_TALL },
    ])

    expect(stacked.map((g) => g.ids)).toEqual([[1, 2]])
    expect(apart.map((g) => g.ids)).toEqual([[1], [2]])
  })

  test('nothing to group', () => {
    expect(clusterPoints([])).toEqual([])
  })
})

describe('fanOutOffsets', () => {
  test('one pin stays put', () => {
    expect(fanOutOffsets(1)).toEqual([{ x: 0, y: 0 }])
  })

  test('several pins go round a ring, the first straight up, none touching', () => {
    const offsets = fanOutOffsets(6)

    expect(offsets).toHaveLength(6)
    expect(offsets[0].x).toBe(0)
    expect(offsets[0].y).toBeLessThan(0)
    for (let i = 0; i < offsets.length; i++) {
      for (let j = i + 1; j < offsets.length; j++) {
        expect(Math.hypot(offsets[i].x - offsets[j].x, offsets[i].y - offsets[j].y)).toBeGreaterThanOrEqual(CLUSTER_PX - 1)
      }
    }
  })
})
