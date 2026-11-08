import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { AdminUser, PageMeta } from '@/types/roles'
import type { OwnerVerificationStatus } from '@/types/enums'
import type { Campus } from '@/types/booking'
import type { PlatformStats } from '@/types/dashboard'
import type { DocumentLink } from '@/types/billing'
import type { TableFormat, TablePreview } from './reports'

export type OwnerCounts = Record<OwnerVerificationStatus, number>

/** An export the admin can preview and download as Excel, PDF or CSV (summary, owners, properties, accounts) */
export interface AdminExport {
  key: string
  label: string
  description: string
}

export const adminService = {
  async exports(): Promise<AdminExport[]> {
    const { data } = await api.get<ApiEnvelope<AdminExport[]>>('/admin/exports')
    return data.data
  },

  /** A short-lived download link for one export, in that format. */
  async exportLink(key: string, format: TableFormat = 'csv'): Promise<DocumentLink & { filename?: string }> {
    const { data } = await api.get<ApiEnvelope<DocumentLink & { filename?: string }>>(`/admin/exports/${key}/link`, { params: { format } })
    return data.data
  },

  /** The first rows of an export and how many there are. */
  async exportPreview(key: string): Promise<TablePreview> {
    const { data } = await api.get<ApiEnvelope<TablePreview>>(`/admin/exports/${key}/preview`)
    return data.data
  },

  /** Counts across the platform: accounts, owners, listings, stays and monthly activity. */
  async stats(): Promise<PlatformStats> {
    const { data } = await api.get<ApiEnvelope<PlatformStats>>('/admin/stats')
    return data.data
  },

  async owners(status: OwnerVerificationStatus, search = '', page = 1) {
    const { data } = await api.get<ApiEnvelope<AdminUser[], PageMeta & { counts: OwnerCounts }>>('/admin/owners', {
      params: { status, search: search || undefined, page },
    })
    return { items: data.data, meta: data.meta! }
  },

  async ownerAction(userId: number, action: 'verify' | 'reject' | 'suspend' | 'reinstate', reason?: string) {
    const { data } = await api.post<ApiEnvelope<AdminUser>>(`/admin/owners/${userId}/${action}`, reason ? { reason } : {})
    return { user: data.data, message: data.message ?? '' }
  },

  async users(search = '', page = 1) {
    const { data } = await api.get<ApiEnvelope<AdminUser[], PageMeta>>('/admin/users', {
      params: { search: search || undefined, page },
    })
    return { items: data.data, meta: data.meta! }
  },

  // Campuses (every call returns the whole list, the default first)
  async campuses(): Promise<Campus[]> {
    const { data } = await api.get<ApiEnvelope<Campus[]>>('/admin/campuses')
    return data.data
  },

  async addCampus(input: { name: string; latitude: number; longitude: number }) {
    const { data } = await api.post<ApiEnvelope<Campus[]>>('/admin/campuses', input)
    return { items: data.data, message: data.message ?? '' }
  },

  async updateCampus(id: number, input: Partial<{ name: string; latitude: number; longitude: number; is_default: boolean }>) {
    const { data } = await api.patch<ApiEnvelope<Campus[]>>(`/admin/campuses/${id}`, input)
    return { items: data.data, message: data.message ?? '' }
  },

  async removeCampus(id: number) {
    const { data } = await api.delete<ApiEnvelope<Campus[]>>(`/admin/campuses/${id}`)
    return { items: data.data, message: data.message ?? '' }
  },

  async setSuspended(userId: number, suspended: boolean) {
    const { data } = await api.post<ApiEnvelope<AdminUser>>(`/admin/users/${userId}/${suspended ? 'suspend' : 'unsuspend'}`)
    return { user: data.data, message: data.message ?? '' }
  },
}
