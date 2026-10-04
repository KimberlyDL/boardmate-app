import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type {
  Building,
  PriceRule,
  Property,
  PropertyCaretakerAssignment,
  PropertySettings,
  PropertySummary,
  SettingsValues,
  Unit,
  UnitSpec,
  UtilityAccount,
} from '@/types/property'

export interface PropertyDetailsInput {
  name?: string
  type?: string
  description?: string | null
  who_can_apply?: string | null
  building_id?: number | null
  street?: string | null
  barangay?: string | null
  city?: string | null
  province?: string | null
  latitude?: number | null
  longitude?: number | null
}

export interface UtilityInput {
  type?: string
  name?: string | null
  method?: string
  billed_by?: string
  notes?: string | null
  amount_centavos?: number | null
}

/** Properties module (client side). Money is always centavos. */
export const propertyService = {
  async list(): Promise<PropertySummary[]> {
    const { data } = await api.get<ApiEnvelope<PropertySummary[]>>('/properties')
    return data.data
  },

  async get(id: number): Promise<Property> {
    const { data } = await api.get<ApiEnvelope<Property>>(`/properties/${id}`)
    return data.data
  },

  async create(input: PropertyDetailsInput & { rental_mode: string; units: UnitSpec }): Promise<Property> {
    const { data } = await api.post<ApiEnvelope<Property>>('/properties', input)
    return data.data
  },

  async update(id: number, input: PropertyDetailsInput): Promise<Property> {
    const { data } = await api.patch<ApiEnvelope<Property>>(`/properties/${id}`, input)
    return data.data
  },

  async remove(id: number): Promise<string> {
    const { data } = await api.delete<{ message: string }>(`/properties/${id}`)
    return data.message
  },

  async publish(id: number, publish: boolean): Promise<{ property: Property; message: string }> {
    const { data } = await api.post<ApiEnvelope<Property>>(`/properties/${id}/${publish ? 'publish' : 'unpublish'}`)
    return { property: data.data, message: data.message ?? '' }
  },

  async switchMode(id: number, rentalMode: string, units: UnitSpec): Promise<Property> {
    const { data } = await api.post<ApiEnvelope<Property>>(`/properties/${id}/rental-mode`, { rental_mode: rentalMode, units })
    return data.data
  },

  // Units
  async addBedspaces(id: number, input: { count: number; label_pattern?: string; rent_centavos?: number | null }): Promise<Unit[]> {
    const { data } = await api.post<ApiEnvelope<Unit[]>>(`/properties/${id}/units`, input)
    return data.data
  },

  async updateUnit(unitId: number, input: { label?: string; capacity?: number }): Promise<Unit> {
    const { data } = await api.patch<ApiEnvelope<Unit>>(`/units/${unitId}`, input)
    return data.data
  },

  async removeUnit(unitId: number): Promise<void> {
    await api.delete(`/units/${unitId}`)
  },

  async setNotReady(unitId: number, notReady: boolean, reason?: string): Promise<Unit> {
    const { data } = await api.patch<ApiEnvelope<Unit>>(`/units/${unitId}/not-ready`, { not_ready: notReady, reason })
    return data.data
  },

  async setRent(unitId: number, amountCentavos: number, effectiveFrom?: string): Promise<Unit> {
    const { data } = await api.put<ApiEnvelope<Unit>>(`/units/${unitId}/rent`, {
      amount_centavos: amountCentavos,
      effective_from: effectiveFrom || undefined,
    })
    return data.data
  },

  async unitPriceHistory(unitId: number): Promise<PriceRule[]> {
    const { data } = await api.get<ApiEnvelope<PriceRule[]>>(`/units/${unitId}/price-history`)
    return data.data
  },

  // Utilities
  async addUtility(id: number, input: UtilityInput): Promise<UtilityAccount> {
    const { data } = await api.post<ApiEnvelope<UtilityAccount>>(`/properties/${id}/utility-accounts`, input)
    return data.data
  },

  async updateUtility(accountId: number, input: UtilityInput): Promise<UtilityAccount> {
    const { data } = await api.patch<ApiEnvelope<UtilityAccount>>(`/utility-accounts/${accountId}`, input)
    return data.data
  },

  async setUtilityAmount(accountId: number, amountCentavos: number, effectiveFrom?: string): Promise<UtilityAccount> {
    const { data } = await api.put<ApiEnvelope<UtilityAccount>>(`/utility-accounts/${accountId}/amount`, {
      amount_centavos: amountCentavos,
      effective_from: effectiveFrom || undefined,
    })
    return data.data
  },

  async removeUtility(accountId: number): Promise<void> {
    await api.delete(`/utility-accounts/${accountId}`)
  },

  // Settings
  async settings(id: number): Promise<PropertySettings> {
    const { data } = await api.get<ApiEnvelope<PropertySettings>>(`/properties/${id}/settings`)
    return data.data
  },

  async updateSettings(id: number, values: SettingsValues): Promise<PropertySettings> {
    const { data } = await api.put<ApiEnvelope<PropertySettings>>(`/properties/${id}/settings`, values)
    return data.data
  },

  async resetSettings(id: number, sections: string[]): Promise<PropertySettings> {
    const { data } = await api.post<ApiEnvelope<PropertySettings>>(`/properties/${id}/settings/reset`, { sections })
    return data.data
  },

  // Photos
  async uploadPhotos(id: number, files: File[]): Promise<Property> {
    const form = new FormData()
    files.forEach((f) => form.append('photos[]', f))
    const { data } = await api.post<ApiEnvelope<Property>>(`/properties/${id}/photos`, form)
    return data.data
  },

  async reorderPhotos(id: number, ids: number[]): Promise<Property> {
    const { data } = await api.patch<ApiEnvelope<Property>>(`/properties/${id}/photos/order`, { ids })
    return data.data
  },

  async setCover(id: number, photoId: number): Promise<Property> {
    const { data } = await api.patch<ApiEnvelope<Property>>(`/properties/${id}/photos/${photoId}/cover`)
    return data.data
  },

  async removePhoto(id: number, photoId: number): Promise<Property> {
    const { data } = await api.delete<ApiEnvelope<Property>>(`/properties/${id}/photos/${photoId}`)
    return data.data
  },

  // Caretakers
  async setCaretakers(id: number, assignments: { caretaker_id: number; access_level: string }[]): Promise<PropertyCaretakerAssignment[]> {
    const { data } = await api.put<ApiEnvelope<PropertyCaretakerAssignment[]>>(`/properties/${id}/caretakers`, { assignments })
    return data.data
  },

  // Buildings
  async buildings(): Promise<Building[]> {
    const { data } = await api.get<ApiEnvelope<Building[]>>('/owner/buildings')
    return data.data
  },

  async addBuilding(name: string): Promise<Building> {
    const { data } = await api.post<ApiEnvelope<Building>>('/owner/buildings', { name })
    return data.data
  },
}
