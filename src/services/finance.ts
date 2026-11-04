import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { DocumentLink } from '@/types/billing'
import type { CollectionsSummary, PortfolioFinance, PropertyFinance, RoomFinance, StayFinance } from '@/types/finance'

/** A period: both dates or neither (the API's default is this month). */
export interface FinanceQuery {
  from?: string | null
  to?: string | null
}

function params(query: FinanceQuery = {}, extra: Record<string, string | number> = {}): Record<string, string | number> {
  return { ...extra, ...(query.from && query.to ? { from: query.from, to: query.to } : {}) }
}

/** Finances for the owner and Managers (A11). Each view has a PDF statement behind a short-lived link. */
export const financeService = {
  /** Every property I see finances of, or one (`propertyId`). */
  async portfolio(query: FinanceQuery = {}, propertyId: number | null = null): Promise<PortfolioFinance> {
    const { data } = await api.get<ApiEnvelope<PortfolioFinance>>('/finance', { params: params(query, propertyId ? { property_id: propertyId } : {}) })
    return data.data
  },

  async property(propertyId: number, query: FinanceQuery = {}): Promise<PropertyFinance> {
    const { data } = await api.get<ApiEnvelope<PropertyFinance>>(`/properties/${propertyId}/finance`, { params: params(query) })
    return data.data
  },

  async room(roomId: number, query: FinanceQuery = {}): Promise<RoomFinance> {
    const { data } = await api.get<ApiEnvelope<RoomFinance>>(`/rooms/${roomId}/finance`, { params: params(query) })
    return data.data
  },

  async stay(tenancyId: number): Promise<StayFinance> {
    const { data } = await api.get<ApiEnvelope<StayFinance>>(`/tenancies/${tenancyId}/finance`)
    return data.data
  },

  async portfolioPdf(query: FinanceQuery = {}, propertyId: number | null = null): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>('/finance/pdf-link', { params: params(query, propertyId ? { property_id: propertyId } : {}) })
    return data.data
  },

  async propertyPdf(propertyId: number, query: FinanceQuery = {}): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>(`/properties/${propertyId}/finance/pdf-link`, { params: params(query) })
    return data.data
  },

  async roomPdf(roomId: number, query: FinanceQuery = {}): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>(`/rooms/${roomId}/finance/pdf-link`, { params: params(query) })
    return data.data
  },

  async stayPdf(tenancyId: number): Promise<DocumentLink> {
    const { data } = await api.get<ApiEnvelope<DocumentLink>>(`/tenancies/${tenancyId}/finance/pdf-link`)
    return data.data
  },

  /** Collections for everyone who follows up payments, Collectors included: this week, as of today. */
  async collections(propertyId: number | null = null): Promise<CollectionsSummary> {
    const { data } = await api.get<ApiEnvelope<CollectionsSummary>>('/me/collections', { params: propertyId ? { property_id: propertyId } : {} })
    return data.data
  },
}
