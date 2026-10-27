/** "350 m", "1.2 km", "12 km" — a straight-line distance for people. */
export function formatDistance(metres: number | null | undefined): string {
  if (metres === null || metres === undefined) return ''
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`
  const km = metres / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}

/** The Finder's "Within" choices, in km; null = any distance. */
export const RADIUS_CHOICES_KM = [1, 2, 3, 5] as const
/** How far to search at the start, in km */
export const DEFAULT_RADIUS_KM = 1

const METRES_PER_DEGREE_LAT = 111_320

/** The square area (south, west, north, east) around a circle */
export function boxAround(lat: number, lng: number, metres: number): [number, number, number, number] {
  const dLat = metres / METRES_PER_DEGREE_LAT
  const dLng = metres / (METRES_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180))
  return [lat - dLat, lng - dLng, lat + dLat, lng + dLng]
}

/** Places no farther than `metres` (by the API's `distance_m`); places without a distance are kept. */
export function withinRadius<T extends { distance_m: number | null }>(places: T[], metres: number): T[] {
  return places.filter((p) => p.distance_m === null || p.distance_m <= metres)
}
