import { describe, expect, test, vi } from 'vitest'
import { useDistanceFrom } from '@/composables/useDistanceFrom'
import { RADIUS_CHOICES_KM } from '@/lib/distance'
import { api } from '@/services/api'
import { placeService } from '@/services/places'

const saved = vi.hoisted(() => new Map<string, string>())
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: vi.fn(async ({ key }: { key: string }) => ({ value: saved.get(key) ?? null })),
    set: vi.fn(async ({ key, value }: { key: string; value: string }) => void saved.set(key, value)),
  },
}))
vi.mock('@/services/listings', () => ({ listingService: { campuses: vi.fn(async () => []) } }))

describe('address search', () => {
  test('a found place becomes the point distance is measured from, and is remembered', async () => {
    const distance = useDistanceFrom()
    await distance.ready

    await distance.choosePlace('Naujan', 13.324239, 121.3030659)

    expect(distance.label.value).toBe('Naujan')
    expect(distance.near.value).toEqual({ lat: 13.324239, lng: 121.3030659 })
    expect(JSON.parse(saved.get('dormlink.distanceFrom')!)).toEqual({ kind: 'place', name: 'Naujan', lat: 13.324239, lng: 121.3030659 })
  })

  test('asks the API for places with the typed words', async () => {
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { data: [{ name: 'Naujan', area: 'Oriental Mindoro' }] } })

    const found = await placeService.search('naujan')

    expect(get).toHaveBeenCalledWith('/places/search', { params: { q: 'naujan' } })
    expect(found[0].name).toBe('Naujan')
  })

  test('offers distances wide enough for a nearby town', () => {
    expect(RADIUS_CHOICES_KM).toEqual([1, 2, 3, 5, 10, 20, 50])
  })
})
