import { describe, expect, it } from 'vitest'
import { clockTime, manila, manilaDate } from '@/lib/dayjs'

/*
| Unit tests run with the device zone set to Tokyo (UTC+9, ahead of Manila;
| see vite.config.ts): a date-only value must never shift a day.
*/
describe('manilaDate', () => {
  it('runs on a device ahead of Manila, where the old way showed the day before', () => {
    expect(new Date('2026-10-20T00:00:00').getTimezoneOffset()).toBe(-540)
    expect(manila('2026-10-20').format('YYYY-MM-DD')).toBe('2026-10-19') // why manilaDate exists
  })

  it('keeps a calendar date as the same day whatever the device zone', () => {
    expect(manilaDate('2026-10-20').format('MMM D, YYYY')).toBe('Oct 20, 2026')
    expect(manilaDate('2026-01-01').format('YYYY-MM-DD')).toBe('2026-01-01')
    expect(manilaDate('2026-10-31T00:00:00.000000Z').format('YYYY-MM-DD')).toBe('2026-10-31')
  })

  it('is Manila midnight', () => {
    expect(manilaDate('2026-10-20').toISOString()).toBe('2026-10-19T16:00:00.000Z')
  })
})

describe('manila', () => {
  it('shows a moment in Manila time', () => {
    expect(manila('2026-10-19T16:30:00Z').format('MMM D, h:mm A')).toBe('Oct 20, 12:30 AM')
  })
})

describe('clockTime', () => {
  it('shows a wall-clock time as is', () => {
    expect(clockTime('22:00:00')).toBe('10:00 PM')
    expect(clockTime('06:30')).toBe('6:30 AM')
  })
})
