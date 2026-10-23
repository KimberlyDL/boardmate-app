import { describe, expect, test } from 'vitest'
import { boxAround, formatDistance, withinRadius } from '@/lib/distance'

describe('formatDistance', () => {
  test('metres below 1 km, rounded to 10 m', () => {
    expect(formatDistance(4)).toBe('10 m')
    expect(formatDistance(347)).toBe('350 m')
    expect(formatDistance(994)).toBe('990 m')
  })

  test('kilometres with one decimal under 10 km, whole above', () => {
    expect(formatDistance(1000)).toBe('1.0 km')
    expect(formatDistance(1234)).toBe('1.2 km')
    expect(formatDistance(12_345)).toBe('12 km')
  })

  test('nothing when there is no distance', () => {
    expect(formatDistance(null)).toBe('')
  })
})

describe('radius search', () => {
  test('the box around a point holds the circle: 3 km is about 0.027° of latitude in Calapan', () => {
    const [s, w, n, e] = boxAround(13.388, 121.1627, 3000)

    expect(n - 13.388).toBeCloseTo(0.02695, 4)
    expect(13.388 - s).toBeCloseTo(0.02695, 4)
    // A degree of longitude is shorter away from the equator, so the box is a little wider in degrees.
    expect(e - 121.1627).toBeGreaterThan(n - 13.388)
    expect(e - 121.1627).toBeCloseTo(121.1627 - w, 6)
  })

  test('drops the places in the corners beyond the radius', () => {
    const places = [{ distance_m: 500 }, { distance_m: 3000 }, { distance_m: 3900 }, { distance_m: null }]

    expect(withinRadius(places, 3000)).toEqual([{ distance_m: 500 }, { distance_m: 3000 }, { distance_m: null }])
  })
})
