import type { ApiEnvelope } from '@/types/api'
import { api } from './api'

export interface PlaceCity {
  code: string
  /** What people call it, e.g. "Calapan City" */
  name: string
  is_city: boolean
}

export interface PlaceProvince {
  code: string
  /** e.g. "Oriental Mindoro"; Metro Manila is listed as a province */
  name: string
  cities: PlaceCity[]
}

/** A place or address found by the address search (OpenStreetMap) */
export interface FoundPlace {
  /** e.g. "Naujan" or "J. P. Rizal Street" */
  name: string
  /** e.g. "Masipit, Calapan, Oriental Mindoro" */
  area: string
  label: string
  /** town, city, village, road, school… */
  kind: string
  latitude: number
  longitude: number
}

let cached: Promise<PlaceProvince[]> | null = null

/** The official province and city list (PSGC) for location pickers; fetched once per app session. */
export const placeService = {
  provinces(): Promise<PlaceProvince[]> {
    cached ??= api
      .get<ApiEnvelope<PlaceProvince[]>>('/places')
      .then(({ data }) => data.data)
      .catch((e) => {
        cached = null
        throw e
      })
    return cached
  },

  /** Places and addresses in the Philippines matching the words (at least 3 letters). */
  async search(q: string): Promise<FoundPlace[]> {
    const { data } = await api.get<ApiEnvelope<FoundPlace[]>>('/places/search', { params: { q } })
    return data.data
  },
}

/** Lower case without accents, so "munoz" finds "Muñoz" and "las pinas" finds "Las Piñas". */
export function searchKey(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
