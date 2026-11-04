import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { MyDashboard, PropertyDashboard, TenantHome, TenantSpending } from '@/types/dashboard'

/** Owner and caretaker dashboards (A10). */
export const dashboardService = {
  async mine(): Promise<MyDashboard> {
    const { data } = await api.get<ApiEnvelope<MyDashboard>>('/me/dashboard')
    return data.data
  },

  /** The signed-in boarder's home. */
  async home(): Promise<TenantHome> {
    const { data } = await api.get<ApiEnvelope<TenantHome>>('/me/home')
    return data.data
  },

  /** The signed-in boarder's last 12 months of bills, payments and room-group shares. */
  async spending(): Promise<TenantSpending> {
    const { data } = await api.get<ApiEnvelope<TenantSpending>>('/me/spending')
    return data.data
  },

  async property(propertyId: number): Promise<PropertyDashboard> {
    const { data } = await api.get<ApiEnvelope<PropertyDashboard>>(`/properties/${propertyId}/dashboard`)
    return data.data
  },
}
