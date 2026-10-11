/** "350 m", "1.2 km", "12 km" — a straight-line distance for people. */
export function formatDistance(metres: number | null | undefined): string {
  if (metres === null || metres === undefined) return ''
  if (metres < 1000) return `${Math.max(10, Math.round(metres / 10) * 10)} m`
  const km = metres / 1000
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`
}
