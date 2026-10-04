import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { PageMeta } from '@/types/roles'
import type { AuditEvent } from '@/types/enums'

export interface AuditEntry {
  id: number
  event: AuditEvent | string
  description: string
  actor: {
    id: number | null
    name: string
    acting_as: string | null
    acting_as_label: string | null
  }
  note: string | null
  reason: string | null
  changes: { field: string; label: string; old: string | null; new: string | null }[]
  created_at: string
}

export interface AuditFilters {
  event?: string
  from?: string
  to?: string
}

/** Audit module (client side): the owner's business log or the admin log. */
export const auditService = {
  async list(scope: 'owner' | 'admin', filters: AuditFilters = {}, page = 1) {
    const { data } = await api.get<ApiEnvelope<AuditEntry[], PageMeta>>(`/${scope}/audit-log`, {
      params: { ...filters, page },
    })
    return { items: data.data, meta: data.meta! }
  },
}
