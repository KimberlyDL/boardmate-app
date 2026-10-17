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
  SettleInput,
  SettlementResult,
  SettlementWorksheet,
  Tenancy,
  TenancyNotice,
  TenancyState,
  WalkInRequest,
} from '@/types/tenancy'
import type { DocumentLink } from '@/types/billing'

/** Tenancies (C1), room leaders and occupants (C2), and the tenancy discount (C3). */
export const tenancyService = {
  /** Staff: the property's tenancies, optionally for one room. `ended` = moved out, deposit not settled yet. */
  async list(propertyId: number, roomId?: number, page = 1, status: 'current' | 'ended' | 'settled' = 'current') {
    const { data } = await api.get<ApiEnvelope<Tenancy[], PageMeta>>(`/properties/${propertyId}/tenancies`, {
      params: { room_id: roomId, page, status },
    })
    return { items: data.data, meta: data.meta! }
  },

  // Notice and end date (C1)
  async pendingNotices(propertyId: number): Promise<TenancyNotice[]> {
    const { data } = await api.get<ApiEnvelope<TenancyNotice[]>>(`/properties/${propertyId}/notices`)
    return data.data
  },

  async notices(tenancyId: number): Promise<TenancyNotice[]> {
    const { data } = await api.get<ApiEnvelope<TenancyNotice[]>>(`/tenancies/${tenancyId}/notices`)
    return data.data
  },

  /** The boarder gives notice: their last day of stay. */
  async giveNotice(tenancyId: number, endOn: string): Promise<{ notice: TenancyNotice; message: string }> {
    const { data } = await api.post<ApiEnvelope<TenancyNotice>>(`/tenancies/${tenancyId}/notice`, { end_on: endOn })
    return { notice: data.data, message: data.message ?? '' }
  },

  async withdrawNotice(tenancyId: number): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<null>>(`/tenancies/${tenancyId}/notice`)
    return data.message ?? ''
  },

  async approveNotice(tenancyId: number) {
    const { data } = await api.post<ApiEnvelope<TenancyState>>(`/tenancies/${tenancyId}/notice/approve`)
    return { state: data.data, message: data.message ?? '' }
  },

  async declineNotice(tenancyId: number, reason: string): Promise<string> {
    const { data } = await api.post<ApiEnvelope<null>>(`/tenancies/${tenancyId}/notice/decline`, { reason })
    return data.message ?? ''
  },

  async setEndDate(tenancyId: number, endOn: string, reason: string) {
    const { data } = await api.put<ApiEnvelope<TenancyState>>(`/tenancies/${tenancyId}/end-date`, { end_on: endOn, reason })
    return { state: data.data, message: data.message ?? '' }
  },

  async cancelEndDate(tenancyId: number, reason: string) {
    const { data } = await api.delete<ApiEnvelope<TenancyState>>(`/tenancies/${tenancyId}/end-date`, { data: { reason } })
    return { state: data.data, message: data.message ?? '' }
  },

  async recordMoveOut(tenancyId: number, movedOutOn: string, reason?: string) {
    const { data } = await api.post<ApiEnvelope<TenancyState>>(`/tenancies/${tenancyId}/move-out`, { moved_out_on: movedOutOn, reason })
    return { state: data.data, message: data.message ?? '' }
  },

  // Deposit settlement (C8)
  async settlement(tenancyId: number): Promise<SettlementWorksheet | SettlementResult> {
    const { data } = await api.get<ApiEnvelope<SettlementWorksheet | SettlementResult>>(`/tenancies/${tenancyId}/settlement`)
    return data.data
  },

  async settle(tenancyId: number, input: SettleInput): Promise<{ result: SettlementResult; message: string }> {
    const { data } = await api.post<ApiEnvelope<SettlementResult>>(`/tenancies/${tenancyId}/settlement`, input)
    return { result: data.data, message: data.message ?? '' }
  },

  async settlementSummaryLink(tenancyId: number): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>(`/tenancies/${tenancyId}/settlement/summary-link`)
    return data.data
  },

  async get(id: number): Promise<Tenancy> {
    const { data } = await api.get<ApiEnvelope<Tenancy>>(`/tenancies/${id}`)
    return data.data
  },

  /** The signed-in boarder's current stay (normally one), or with `past` their moved-out stays. */
  async mine(past = false): Promise<Tenancy[]> {
    const { data } = await api.get<ApiEnvelope<Tenancy[]>>('/me/tenancies', past ? { params: { past: 1 } } : undefined)
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
