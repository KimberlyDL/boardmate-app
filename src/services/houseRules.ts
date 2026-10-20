import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { HouseRuleInput, HouseRuleVersion, PropertyHouseRules, StayHouseRules } from '@/types/houseRules'

/** House rules (D3): staff edit and publish; tenants read and accept. */
export const houseRuleService = {
  async forProperty(propertyId: number): Promise<PropertyHouseRules> {
    const { data } = await api.get<ApiEnvelope<PropertyHouseRules>>(`/properties/${propertyId}/house-rules`)
    return data.data
  },

  async version(propertyId: number, version: number): Promise<HouseRuleVersion> {
    const { data } = await api.get<ApiEnvelope<HouseRuleVersion>>(`/properties/${propertyId}/house-rules/versions/${version}`)
    return data.data
  },

  async saveDraft(propertyId: number, rules: HouseRuleInput[], note: string | null): Promise<{ draft: HouseRuleVersion; message: string }> {
    const { data } = await api.put<ApiEnvelope<HouseRuleVersion>>(`/properties/${propertyId}/house-rules/draft`, { rules, note })
    return { draft: data.data, message: data.message ?? '' }
  },

  async discardDraft(propertyId: number): Promise<string> {
    const { data } = await api.delete<ApiEnvelope<null>>(`/properties/${propertyId}/house-rules/draft`)
    return data.message ?? ''
  },

  async publish(propertyId: number): Promise<{ version: HouseRuleVersion; message: string }> {
    const { data } = await api.post<ApiEnvelope<HouseRuleVersion>>(`/properties/${propertyId}/house-rules/publish`)
    return { version: data.data, message: data.message ?? '' }
  },

  async forStay(tenancyId: number): Promise<StayHouseRules> {
    const { data } = await api.get<ApiEnvelope<StayHouseRules>>(`/tenancies/${tenancyId}/house-rules`)
    return data.data
  },

  async accept(tenancyId: number, version: number): Promise<string> {
    const { data } = await api.post<ApiEnvelope<null>>(`/tenancies/${tenancyId}/house-rules/accept`, { version })
    return data.message ?? ''
  },
}
