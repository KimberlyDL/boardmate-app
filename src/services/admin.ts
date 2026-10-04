import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { AdminUser, PageMeta } from '@/types/roles'
import type { OwnerVerificationStatus } from '@/types/enums'

export type OwnerCounts = Record<OwnerVerificationStatus, number>

export const adminService = {
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

  async setSuspended(userId: number, suspended: boolean) {
    const { data } = await api.post<ApiEnvelope<AdminUser>>(`/admin/users/${userId}/${suspended ? 'suspend' : 'unsuspend'}`)
    return { user: data.data, message: data.message ?? '' }
  },
}
