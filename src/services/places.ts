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
}

/** Lower case without accents, so "munoz" finds "Muñoz" and "las pinas" finds "Las Piñas". */
export function searchKey(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
