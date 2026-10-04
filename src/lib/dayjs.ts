import dayjs from 'dayjs'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

/** All BoardMate dates are Asia/Manila, matching the API. */
export const MANILA_TZ = 'Asia/Manila'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault(MANILA_TZ)

/** Parse an API date/time and view it in Manila time. */
export const manila = (value?: string | Date) => dayjs(value).tz(MANILA_TZ)

export default dayjs
