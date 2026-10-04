import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

/** All BoardMate dates are Asia/Manila, matching the API. */
export const MANILA_TZ = 'Asia/Manila'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)
dayjs.tz.setDefault(MANILA_TZ)

/**
 * A moment in time from the API (`…_at`, ISO with offset), shown in Manila
 * time. Omit the value for "now in Manila" (e.g. today's date for a form).
 */
export const manila = (value?: string | Date) => dayjs(value).tz(MANILA_TZ)

/**
 * A calendar date from the API (`…_on`, `reserved_until`, `effective_from`:
 * "YYYY-MM-DD"). It is a Manila date, not a moment, so it is read as Manila
 * midnight. Using manila() here would show the day before on phones set to a
 * zone ahead of Manila (Japan, Australia).
 */
export const manilaDate = (value: string) => dayjs.tz(value.slice(0, 10), 'YYYY-MM-DD', MANILA_TZ)

/** A wall-clock time ("22:00" or "22:00:00", e.g. curfew) as "10:00 PM". Never time-zone converted. */
export const clockTime = (value: string) => dayjs(value.slice(0, 5), 'HH:mm').format('h:mm A')

export default dayjs
