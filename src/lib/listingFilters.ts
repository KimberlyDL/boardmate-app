import { toCentavos } from './money'

/** What the Dorm Finder filter UI holds (pesos as typed). */
export interface FinderFilters {
  q: string
  minPrice: string
  maxPrice: string
  mode: '' | 'bedspaces' | 'whole'
  includes: string[]
  who: string
  /** Rooms for this group (rooms for anyone count too) */
  whoCanStay: '' | 'female' | 'male'
  /** Hide full places */
  availableOnly: boolean
  /** "nearest" needs a distance point (see toQuery's `near`) */
  sort: 'newest' | 'price' | 'nearest'
  /** south, west, north, east — set by "Search this area" on the map. */
  bbox: [number, number, number, number] | null
}

export const emptyFilters = (): FinderFilters => ({
  q: '',
  minPrice: '',
  maxPrice: '',
  mode: '',
  includes: [],
  who: '',
  whoCanStay: '',
  availableOnly: false,
  sort: 'newest',
  bbox: null,
})

/**
 * Turn the UI filters into API query params (centavos, comma bbox), dropping
 * empty ones. `near` (lat, lng) asks for distances; without it "nearest" falls
 * back to newest.
 */
export function toQuery(
  f: FinderFilters,
  page = 1,
  near: { lat: number; lng: number } | null = null,
): Record<string, string | number | string[]> {
  const query: Record<string, string | number | string[]> = { page }
  if (f.q.trim()) query.q = f.q.trim()
  const min = toCentavos(f.minPrice)
  const max = toCentavos(f.maxPrice)
  if (min !== null) query.min_price = min
  if (max !== null) query.max_price = max
  if (f.mode) query.rental_mode = f.mode
  if (f.includes.length) query.includes = f.includes
  if (f.who.trim()) query.who = f.who.trim()
  if (f.whoCanStay) query.who_can_stay = f.whoCanStay
  if (f.availableOnly) query.available = 1
  if (near) query.near = `${near.lat.toFixed(6)},${near.lng.toFixed(6)}`
  if (f.sort === 'price' || (f.sort === 'nearest' && near)) query.sort = f.sort
  if (f.bbox) query.bbox = f.bbox.map((n) => n.toFixed(5)).join(',')
  return query
}

/** How many filters are active (for the "Filters (3)" button). */
export function activeCount(f: FinderFilters): number {
  return [f.minPrice, f.maxPrice, f.mode, f.who, f.whoCanStay, f.availableOnly].filter(Boolean).length + f.includes.length + (f.bbox ? 1 : 0)
}

/** The Dorm Finder filters as URL query params (what the landing search sends to /find). */
export function toRouteQuery(f: FinderFilters): Record<string, string> {
  const query: Record<string, string> = {}
  if (f.q.trim()) query.q = f.q.trim()
  if (f.minPrice.trim()) query.min = f.minPrice.trim()
  if (f.maxPrice.trim()) query.max = f.maxPrice.trim()
  if (f.mode) query.mode = f.mode
  if (f.includes.length) query.includes = f.includes.join(',')
  if (f.who.trim()) query.who = f.who.trim()
  return query
}

const first = (v: unknown): string => (Array.isArray(v) ? String(v[0] ?? '') : typeof v === 'string' ? v : '')

/** Read filters back from a /find URL query. Unknown or invalid values are ignored. */
export function fromRouteQuery(query: Record<string, unknown>): Partial<FinderFilters> {
  const out: Partial<FinderFilters> = {}
  if (first(query.q)) out.q = first(query.q)
  if (first(query.min)) out.minPrice = first(query.min)
  if (first(query.max)) out.maxPrice = first(query.max)
  const mode = first(query.mode)
  if (mode === 'bedspaces' || mode === 'whole') out.mode = mode
  const includes = first(query.includes).split(',').filter((u) => ['water', 'electricity', 'internet'].includes(u))
  if (includes.length) out.includes = includes
  if (first(query.who)) out.who = first(query.who)
  return out
}
