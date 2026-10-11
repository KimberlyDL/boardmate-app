import { describe, expect, test } from 'vitest'
import { formatDistance } from '@/lib/distance'

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
