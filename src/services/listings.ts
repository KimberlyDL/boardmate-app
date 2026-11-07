import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { PageMeta } from '@/types/roles'
import type { BookingApplication, Campus, ListingDetail, ListingSummary } from '@/types/booking'

/** A province with places on the Finder, and its cities that have some. */
export interface ListingPlace {
  name: string
  count: number
  cities: { name: string; count: number }[]
}

/** Dorm Finder (F1): public, works signed out. */
export const listingService = {
  async search(params: Record<string, string | number | string[]>) {
    const { data } = await api.get<ApiEnvelope<ListingSummary[], PageMeta>>('/listings', { params })
    return { items: data.data, meta: data.meta! }
  },

  /** `my_application` is set when a signed-in boarder already applied here. */
  async get(id: number): Promise<{ listing: ListingDetail; my_application: BookingApplication | null }> {
    const { data } = await api.get<ApiEnvelope<{ listing: ListingDetail; my_application: BookingApplication | null }>>(`/listings/${id}`)
    return data.data
  },

  /** Provinces and cities that have places on the Finder, with how many (for the location filters). */
  async places(): Promise<ListingPlace[]> {
    const { data } = await api.get<ApiEnvelope<ListingPlace[]>>('/listings/places')
    return data.data
  },

  /** The default campus first. */
  async campuses(): Promise<Campus[]> {
    const { data } = await api.get<ApiEnvelope<Campus[]>>('/campuses')
    return data.data
  },
}
