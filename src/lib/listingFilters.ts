import { toCentavos } from './money'

/** What the Dorm Finder filter UI holds (pesos as typed). */
export interface FinderFilters {
  q: string
  minPrice: string
  maxPrice: string
  mode: '' | 'bedspaces' | 'whole'
  includes: string[]
  who: string
  sort: 'newest' | 'price'
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
  sort: 'newest',
  bbox: null,
})

/** Turn the UI filters into API query params (centavos, comma bbox), dropping empty ones. */
export function toQuery(f: FinderFilters, page = 1): Record<string, string | number | string[]> {
  const query: Record<string, string | number | string[]> = { page }
  if (f.q.trim()) query.q = f.q.trim()
  const min = toCentavos(f.minPrice)
  const max = toCentavos(f.maxPrice)
  if (min !== null) query.min_price = min
  if (max !== null) query.max_price = max
  if (f.mode) query.rental_mode = f.mode
  if (f.includes.length) query.includes = f.includes
  if (f.who.trim()) query.who = f.who.trim()
  if (f.sort !== 'newest') query.sort = f.sort
  if (f.bbox) query.bbox = f.bbox.map((n) => n.toFixed(5)).join(',')
  return query
}

/** How many filters are active (for the "Filters (3)" button). */
export function activeCount(f: FinderFilters): number {
  return [f.minPrice, f.maxPrice, f.mode, f.who].filter(Boolean).length + f.includes.length + (f.bbox ? 1 : 0)
}
