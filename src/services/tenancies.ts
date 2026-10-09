import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { PageMeta } from '@/types/roles'
import type {
  DiscountRow,
  EmergencyContact,
  MoveInQuote,
  MoveInRequest,
  NewOccupantInput,
  RoomLeader,
  RoomOccupant,
  Tenancy,
  WalkInRequest,
} from '@/types/tenancy'

/** Tenancies (C1), room leaders and occupants (C2), and the tenancy discount (C3). */
export const tenancyService = {
  /** Staff: the property's current tenancies, optionally for one room. */
  async list(propertyId: number, roomId?: number, page = 1) {
    const { data } = await api.get<ApiEnvelope<Tenancy[], PageMeta>>(`/properties/${propertyId}/tenancies`, {
      params: { room_id: roomId, page },
    })
    return { items: data.data, meta: data.meta! }
  },

  async get(id: number): Promise<Tenancy> {
    const { data } = await api.get<ApiEnvelope<Tenancy>>(`/tenancies/${id}`)
    return data.data
  },

  /** The signed-in boarder's current stay (normally one). */
  async mine(): Promise<Tenancy[]> {
    const { data } = await api.get<ApiEnvelope<Tenancy[]>>('/me/tenancies')
    return data.data
  },

  /** Rent, discount, deposit and first rent for a unit on a day. */
  async preview(propertyId: number, params: { unit_id: number; moved_in_on: string; discount_kind?: string; discount_value?: number }): Promise<MoveInQuote> {
    const { data } = await api.get<ApiEnvelope<MoveInQuote>>(`/properties/${propertyId}/tenancies/preview`, { params })
    return data.data
  },

  async moveIn(applicationId: number, body: MoveInRequest): Promise<{ tenancy: Tenancy; message: string }> {
    const { data } = await api.post<ApiEnvelope<Tenancy>>(`/applications/${applicationId}/move-in`, body)
    return { tenancy: data.data, message: data.message ?? '' }
  },

  async moveInWalkIn(propertyId: number, body: WalkInRequest): Promise<{ tenancy: Tenancy; message: string }> {
    const { data } = await api.post<ApiEnvelope<Tenancy>>(`/properties/${propertyId}/tenancies`, body)
    return { tenancy: data.data, message: data.message ?? '' }
  },

  async updateEmergencyContact(id: number, contact: EmergencyContact): Promise<Tenancy> {
    const { data } = await api.put<ApiEnvelope<Tenancy>>(`/tenancies/${id}/emergency-contact`, contact)
    return data.data
  },

  // Discount
  async discounts(id: number): Promise<DiscountRow[]> {
    const { data } = await api.get<ApiEnvelope<DiscountRow[]>>(`/tenancies/${id}/discounts`)
    return data.data
  },

  async setDiscount(id: number, body: { kind: string; value: number; effective_from?: string }): Promise<string> {
    const { data } = await api.put<ApiEnvelope<DiscountRow>>(`/tenancies/${id}/discount`, body)
    return data.message ?? ''
  },

  async endDiscount(id: number, effectiveFrom?: string): Promise<void> {
    await api.delete(`/tenancies/${id}/discount`, { data: { effective_from: effectiveFrom } })
  },

  // Room leader
  async leader(roomId: number): Promise<RoomLeader | null> {
    const { data } = await api.get<ApiEnvelope<RoomLeader | null>>(`/rooms/${roomId}/leader`)
    return data.data
  },

  async setLeader(roomId: number, userId: number, reason?: string): Promise<RoomLeader> {
    const { data } = await api.put<ApiEnvelope<RoomLeader>>(`/rooms/${roomId}/leader`, { user_id: userId, consent: true, reason })
    return data.data
  },

  // Occupants (rooms rented whole)
  async occupants(roomId: number): Promise<RoomOccupant[]> {
    const { data } = await api.get<ApiEnvelope<RoomOccupant[]>>(`/rooms/${roomId}/occupants`)
    return data.data
  },

  async addOccupant(roomId: number, input: NewOccupantInput): Promise<RoomOccupant> {
    const { data } = await api.post<ApiEnvelope<RoomOccupant>>(`/rooms/${roomId}/occupants`, input)
    return data.data
  },

  async updateOccupant(id: number, fields: Record<string, unknown>): Promise<RoomOccupant> {
    const { data } = await api.patch<ApiEnvelope<RoomOccupant>>(`/occupants/${id}`, fields)
    return data.data
  },

  async removeOccupant(id: number): Promise<void> {
    await api.delete(`/occupants/${id}`)
  },
}
