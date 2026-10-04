import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { PageMeta } from '@/types/roles'
import type { BookingApplication, ListingDetail, ListingSummary } from '@/types/booking'

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
}
