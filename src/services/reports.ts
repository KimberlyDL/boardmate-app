import { api } from './api'
import type { ApiEnvelope } from '@/types/api'

/** A report I may download (A10), with the properties it may cover for me. */
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

/** The file types a report or an admin export comes in. */
export type TableFormat = 'xlsx' | 'pdf' | 'csv'

export const TABLE_FORMATS: { value: TableFormat; label: string; hint: string }[] = [
  { value: 'xlsx', label: 'Excel', hint: 'Numbers and dates ready to sort and add up' },
  { value: 'pdf', label: 'PDF', hint: 'To print or send' },
  { value: 'csv', label: 'CSV', hint: 'Plain file for any program' },
]

/** The first rows of a report or export, as people read them, and how many there are. */
export interface TablePreview {
  title: string
  subtitle: string
  headers: string[]
  rows: string[][]
  total: number
  /** Columns of amounts (right-aligned). */
  money_columns: number[]
}

/** What a report is asked for: `propertyId` null = every property it covers for me; no dates = its default. */
export interface ReportChoice {
  propertyId: number | null
  from?: string | null
  to?: string | null
}

function choiceParams(choice: ReportChoice): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (choice.propertyId) params.property_id = choice.propertyId
  if (choice.from) params.from = choice.from
  if (choice.to) params.to = choice.to
  return params
}

export const reportService = {
  async list(): Promise<ReportInfo[]> {
    const { data } = await api.get<ApiEnvelope<ReportInfo[]>>('/reports')
    return data.data
  },

  /** A short-lived signed link to the file in that format. */
  async link(key: string, choice: ReportChoice, format: TableFormat = 'csv'): Promise<ReportLink> {
    const { data } = await api.get<ApiEnvelope<ReportLink>>(`/reports/${key}/link`, { params: { ...choiceParams(choice), format } })
    return data.data
  },

  async preview(key: string, choice: ReportChoice): Promise<TablePreview> {
    const { data } = await api.get<ApiEnvelope<TablePreview>>(`/reports/${key}/preview`, { params: choiceParams(choice) })
    return data.data
  },
}
