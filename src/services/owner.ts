import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { AccessLevelOption, CaretakerInvitation, CaretakerLink, OwnerPaymentDetails } from '@/types/roles'
import type { User } from '@/types/user'

export interface CaretakerOverview {
  caretakers: CaretakerLink[]
  invitations: CaretakerInvitation[]
  access_levels: AccessLevelOption[]
}

export const ownerService = {
  /** Apply (or re-apply after rejection) to become an owner. */
  async apply(input: { business_name?: string; application_notes: string; phone?: string }): Promise<{ user: User; message: string }> {
    const { data } = await api.post<ApiEnvelope<User>>('/owner/application', input)
    return { user: data.data, message: data.message ?? '' }
  },

  async updateProfile(input: Partial<OwnerPaymentDetails> & { business_name?: string | null }): Promise<User> {
    const { data } = await api.put<ApiEnvelope<User>>('/owner/profile', input)
    return data.data
  },

  async caretakers(): Promise<CaretakerOverview> {
    const { data } = await api.get<ApiEnvelope<CaretakerOverview>>('/owner/caretakers')
    return data.data
  },

  async invite(email: string, accessLevel: string, propertyIds: number[] = []): Promise<string> {
    const { data } = await api.post<ApiEnvelope<CaretakerInvitation>>('/owner/caretaker-invitations', {
      email,
      access_level: accessLevel,
      property_ids: propertyIds,
    })
    return data.message ?? ''
  },

  async resendInvitation(id: number): Promise<string> {
    const { data } = await api.post<ApiEnvelope<CaretakerInvitation>>(`/owner/caretaker-invitations/${id}/resend`)
    return data.message ?? ''
  },

  async revokeInvitation(id: number): Promise<void> {
    await api.delete(`/owner/caretaker-invitations/${id}`)
  },

  async changeAccess(linkId: number, accessLevel: string): Promise<CaretakerLink> {
    const { data } = await api.patch<ApiEnvelope<CaretakerLink>>(`/owner/caretakers/${linkId}`, { access_level: accessLevel })
    return data.data
  },

  async removeCaretaker(linkId: number): Promise<string> {
    const { data } = await api.delete<{ message: string }>(`/owner/caretakers/${linkId}`)
    return data.message
  },
}
