import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { PageMeta } from '@/types/roles'
import type { BookableUnit, BookingApplication } from '@/types/booking'
import type { PlannedOccupant } from '@/types/tenancy'

export interface ApplyInput {
  planned_move_in_on: string
  contact_phone: string
  message?: string
  id_document?: File | null
}

/** Booking (F2): the boarder's applications and the owner/Manager review. */
export const bookingService = {
  async apply(propertyId: number, input: ApplyInput): Promise<{ application: BookingApplication; message: string }> {
    const form = new FormData()
    form.append('planned_move_in_on', input.planned_move_in_on)
    form.append('contact_phone', input.contact_phone)
    if (input.message) form.append('message', input.message)
    if (input.id_document) form.append('id_document', input.id_document)
    const { data } = await api.post<ApiEnvelope<BookingApplication>>(`/listings/${propertyId}/applications`, form)
    return { application: data.data, message: data.message ?? '' }
  },

  async mine(): Promise<{ items: BookingApplication[]; reservationId: number | null }> {
    const { data } = await api.get<ApiEnvelope<BookingApplication[], { reservation_id: number | null }>>('/me/applications')
    return { items: data.data, reservationId: data.meta?.reservation_id ?? null }
  },

  async cancelMine(id: number, reason?: string): Promise<BookingApplication> {
    const { data } = await api.post<ApiEnvelope<BookingApplication>>(`/me/applications/${id}/cancel`, { reason })
    return data.data
  },

  // Owner / Manager
  async list(status = 'pending', propertyId?: number, page = 1) {
    const { data } = await api.get<ApiEnvelope<BookingApplication[], PageMeta & { pending_count: number }>>('/applications', {
      params: { status, property_id: propertyId, page },
    })
    return { items: data.data, meta: data.meta! }
  },

  async get(id: number): Promise<{ application: BookingApplication; units: BookableUnit[] }> {
    const { data } = await api.get<ApiEnvelope<BookingApplication, { bookable_units: BookableUnit[] }>>(`/applications/${id}`)
    return { application: data.data, units: data.meta?.bookable_units ?? [] }
  },

  /** `leader` names the applicant the room's leader (bedspace); `occupants` lists who else will stay (room rented whole). */
  async approve(id: number, unitId: number, extras: { leader?: boolean; occupants?: PlannedOccupant[] } = {}): Promise<string> {
    const { data } = await api.post<ApiEnvelope<BookingApplication>>(`/applications/${id}/approve`, { unit_id: unitId, ...extras })
    return data.message ?? ''
  },

  async decline(id: number, reason?: string): Promise<void> {
    await api.post(`/applications/${id}/decline`, { reason })
  },

  async cancelReservation(id: number, reason: string): Promise<void> {
    await api.post(`/applications/${id}/cancel`, { reason })
  },
}
