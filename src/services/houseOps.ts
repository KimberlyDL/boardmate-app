import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { CurfewViolation, HouseOpsSummary, LateEntry, LateEntryInput, NightsUsed, Visitor, VisitorInput } from '@/types/houseOps'

type One<T> = Promise<{ item: T; message: string }>

async function post<T>(url: string, body?: unknown): One<T> {
  const { data } = await api.post<ApiEnvelope<T>>(url, body)
  return { item: data.data, message: data.message ?? '' }
}

/** Curfew (D2) and visitors (D4): the tenant's side and the staff side. */
export const houseOpsService = {
  // Tenant
  async lateEntries(tenancyId: number): Promise<LateEntry[]> {
    const { data } = await api.get<ApiEnvelope<LateEntry[]>>(`/tenancies/${tenancyId}/late-entries`)
    return data.data
  },
  askLate: (tenancyId: number, input: LateEntryInput) => post<LateEntry>(`/tenancies/${tenancyId}/late-entries`, input),
  cancelLate: (id: number) => post<LateEntry>(`/late-entries/${id}/cancel`),

  async violations(tenancyId: number): Promise<CurfewViolation[]> {
    const { data } = await api.get<ApiEnvelope<CurfewViolation[]>>(`/tenancies/${tenancyId}/curfew-violations`)
    return data.data
  },

  async muteReminders(tenancyId: number, muted: boolean): Promise<string> {
    const { data } = await api.put<ApiEnvelope<{ muted: boolean }>>(`/tenancies/${tenancyId}/curfew-reminders`, { muted })
    return data.message ?? ''
  },

  async visitors(tenancyId: number): Promise<{ items: Visitor[]; nights: NightsUsed }> {
    const { data } = await api.get<ApiEnvelope<Visitor[], { nights: NightsUsed }>>(`/tenancies/${tenancyId}/visitors`)
    return { items: data.data, nights: data.meta!.nights }
  },
  registerVisitor: (tenancyId: number, input: VisitorInput) => post<Visitor>(`/tenancies/${tenancyId}/visitors`, input),
  cancelVisitor: (id: number) => post<Visitor>(`/visitors/${id}/cancel`),

  // Staff
  async summary(): Promise<HouseOpsSummary[]> {
    const { data } = await api.get<ApiEnvelope<HouseOpsSummary[]>>('/me/house-operations-summary')
    return data.data
  },
  async propertyLateEntries(propertyId: number, status: 'pending' | 'upcoming' | 'all' = 'pending'): Promise<LateEntry[]> {
    const { data } = await api.get<ApiEnvelope<LateEntry[]>>(`/properties/${propertyId}/late-entries`, { params: { status } })
    return data.data
  },
  approveLate: (id: number) => post<LateEntry>(`/late-entries/${id}/approve`),
  declineLate: (id: number, reason: string) => post<LateEntry>(`/late-entries/${id}/decline`, { reason }),

  async propertyViolations(propertyId: number): Promise<{ items: CurfewViolation[]; repeated: Record<number, number> }> {
    const { data } = await api.get<ApiEnvelope<CurfewViolation[], { repeated: Record<number, number> }>>(`/properties/${propertyId}/curfew-violations`)
    return { items: data.data, repeated: data.meta?.repeated ?? {} }
  },
  logViolation: (propertyId: number, input: { tenancy_id: number; on_date: string; arrived_at?: string | null; note?: string | null }) =>
    post<CurfewViolation>(`/properties/${propertyId}/curfew-violations`, input),
  async removeViolation(id: number): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<null>>(`/curfew-violations/${id}`)
    return data.message ?? ''
  },

  async propertyVisitors(propertyId: number, view: 'today' | 'pending' | 'all' = 'today'): Promise<Visitor[]> {
    const { data } = await api.get<ApiEnvelope<Visitor[]>>(`/properties/${propertyId}/visitors`, { params: { view } })
    return data.data
  },
  logWalkIn: (propertyId: number, input: { tenancy_id: number; name: string; contact?: string | null; overnight?: boolean; nights?: number | null }) =>
    post<Visitor>(`/properties/${propertyId}/visitors`, input),
  approveVisitor: (id: number) => post<Visitor>(`/visitors/${id}/approve`),
  declineVisitor: (id: number, reason: string) => post<Visitor>(`/visitors/${id}/decline`, { reason }),
  checkIn: (id: number) => post<Visitor>(`/visitors/${id}/check-in`),
  checkOut: (id: number) => post<Visitor>(`/visitors/${id}/check-out`),
}
