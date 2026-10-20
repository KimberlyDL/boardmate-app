import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { MaintenanceInput, MaintenanceRequest, MaintenanceSummary } from '@/types/maintenance'

type Result = Promise<{ request: MaintenanceRequest; message: string }>

function form(input: MaintenanceInput): FormData {
  const data = new FormData()
  data.append('category', input.category)
  data.append('description', input.description)
  data.append('urgency', input.urgency)
  if (input.room_id) data.append('room_id', String(input.room_id))
  input.photos.forEach((p) => data.append('photos[]', p))
  return data
}

async function act(url: string, body?: unknown, method: 'post' | 'put' = 'post'): Result {
  const { data } = await api[method]<ApiEnvelope<MaintenanceRequest>>(url, body)
  return { request: data.data, message: data.message ?? '' }
}

/** Maintenance requests (D1). */
export const maintenanceService = {
  async mine(): Promise<MaintenanceRequest[]> {
    const { data } = await api.get<ApiEnvelope<MaintenanceRequest[]>>('/me/maintenance-requests')
    return data.data
  },

  async summary(): Promise<MaintenanceSummary[]> {
    const { data } = await api.get<ApiEnvelope<MaintenanceSummary[]>>('/me/maintenance-summary')
    return data.data
  },

  /** A boarder reports for their current stay. */
  report(input: MaintenanceInput): Result {
    return act('/me/maintenance-requests', form(input))
  },

  async forProperty(propertyId: number, status: 'open' | 'resolved' | 'done' | 'all' = 'open'): Promise<MaintenanceRequest[]> {
    const { data } = await api.get<ApiEnvelope<MaintenanceRequest[]>>(`/properties/${propertyId}/maintenance-requests`, { params: { status } })
    return data.data
  },

  /** Staff log one themselves. */
  log(propertyId: number, input: MaintenanceInput): Result {
    return act(`/properties/${propertyId}/maintenance-requests`, form(input))
  },

  async get(id: number): Promise<MaintenanceRequest> {
    const { data } = await api.get<ApiEnvelope<MaintenanceRequest>>(`/maintenance-requests/${id}`)
    return data.data
  },

  start: (id: number) => act(`/maintenance-requests/${id}/start`),
  resolve: (id: number, resolution: string | null) => act(`/maintenance-requests/${id}/resolve`, { resolution }),
  cancel: (id: number, reason: string | null) => act(`/maintenance-requests/${id}/cancel`, { reason }),
  confirm: (id: number) => act(`/maintenance-requests/${id}/confirm`),
  reopen: (id: number, reason: string) => act(`/maintenance-requests/${id}/reopen`, { reason }),
  assign: (id: number, userId: number | null) => act(`/maintenance-requests/${id}/assignee`, { user_id: userId }, 'put'),
  setCost: (id: number, centavos: number | null) => act(`/maintenance-requests/${id}/cost`, { repair_cost_centavos: centavos }, 'put'),
  note: (id: number, body: string) => act(`/maintenance-requests/${id}/notes`, { body }),
  charge: (id: number, amountCentavos: number, reason: string) => act(`/maintenance-requests/${id}/charge`, { amount_centavos: amountCentavos, reason }),
  setNotReady: (id: number, notReady: boolean) => act(`/maintenance-requests/${id}/not-ready`, { not_ready: notReady }, 'put'),
}
