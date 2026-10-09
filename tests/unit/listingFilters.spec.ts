import { describe, expect, test } from 'vitest'
import { activeCount, emptyFilters, fromRouteQuery, toQuery, toRouteQuery } from '@/lib/listingFilters'

describe('Dorm Finder filters → API query', () => {
  test('empty filters only send the page', () => {
    expect(toQuery(emptyFilters())).toEqual({ page: 1 })
    expect(activeCount(emptyFilters())).toBe(0)
  })

  test('pesos become centavos; arrays, mode, sort and map box are mapped', () => {
    const f = {
      ...emptyFilters(),
      q: ' Sampaloc ',
      minPrice: '1,500',
      maxPrice: '3000.50',
      mode: 'bedspaces' as const,
      includes: ['water', 'internet'],
      who: 'female',
      sort: 'price' as const,
      bbox: [14.5, 120.9, 14.7, 121.1] as [number, number, number, number],
    }

    expect(toQuery(f, 2)).toEqual({
      page: 2,
      q: 'Sampaloc',
      min_price: 150000,
      max_price: 300050,
      rental_mode: 'bedspaces',
      includes: ['water', 'internet'],
      who: 'female',
      sort: 'price',
      bbox: '14.50000,120.90000,14.70000,121.10000',
    })
    expect(activeCount(f)).toBe(7)
  })

  test('invalid prices are ignored rather than sent', () => {
    expect(toQuery({ ...emptyFilters(), minPrice: 'abc' })).toEqual({ page: 1 })
  })
})

describe('route query round trip', () => {
  test('carries the landing search into /find filters', () => {
    const f = { ...emptyFilters(), q: 'Sampaloc', maxPrice: '3000', mode: 'bedspaces' as const, includes: ['water', 'internet'] }
    const query = toRouteQuery(f)
    expect(query).toEqual({ q: 'Sampaloc', max: '3000', mode: 'bedspaces', includes: 'water,internet' })
    expect(fromRouteQuery(query)).toEqual({ q: 'Sampaloc', maxPrice: '3000', mode: 'bedspaces', includes: ['water', 'internet'] })
  })

  test('ignores invalid values', () => {
    expect(fromRouteQuery({ mode: 'castle', includes: 'gold,water' })).toEqual({ includes: ['water'] })
  })
})
