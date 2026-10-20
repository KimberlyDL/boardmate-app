import { api } from './api'
import type { ApiEnvelope } from '@/types/api'

/** A CSV report I may download (A10), with the properties it may cover for me. */
export interface ReportInfo {
  key: string
  label: string
  description: string
  uses_dates: boolean
  properties: { id: number; name: string }[]
}

export interface ReportLink {
  url: string
  filename: string
  expires_in_minutes: number
}

export const reportService = {
  async list(): Promise<ReportInfo[]> {
    const { data } = await api.get<ApiEnvelope<ReportInfo[]>>('/reports')
    return data.data
  },

  /** A short-lived signed link; `propertyId` null = every property the report covers for me; no dates = the report's default. */
  async link(key: string, propertyId: number | null, from?: string | null, to?: string | null): Promise<ReportLink> {
    const params: Record<string, string | number> = {}
    if (propertyId) params.property_id = propertyId
    if (from) params.from = from
    if (to) params.to = to
    const { data } = await api.get<ApiEnvelope<ReportLink>>(`/reports/${key}/link`, { params })
    return data.data
  },
}
