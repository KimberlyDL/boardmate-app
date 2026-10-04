import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { BoarderProfile, User } from '@/types/user'

export const accountService = {
  async me(): Promise<User> {
    const { data } = await api.get<ApiEnvelope<User>>('/me')
    return data.data
  },

  async updateProfile(input: { name?: string; phone?: string | null }): Promise<User> {
    const { data } = await api.patch<ApiEnvelope<User>>('/me', input)
    return data.data
  },

  async updateBoarderProfile(input: BoarderProfile): Promise<User> {
    const { data } = await api.put<ApiEnvelope<User>>('/me/boarder-profile', input)
    return data.data
  },

  async uploadPhoto(file: File | Blob): Promise<User> {
    const form = new FormData()
    form.append('photo', file)
    const { data } = await api.post<ApiEnvelope<User>>('/me/photo', form)
    return data.data
  },

  async removePhoto(): Promise<User> {
    const { data } = await api.delete<ApiEnvelope<User>>('/me/photo')
    return data.data
  },

  /** Choose which role's screens to show (must be a role the account holds). */
  async switchRole(role: string): Promise<User> {
    const { data } = await api.patch<ApiEnvelope<User>>('/me/active-role', { role })
    return data.data
  },

  /** Starts an email change: the new address must be confirmed by link. */
  async changeEmail(email: string, currentPassword?: string): Promise<{ user: User; message: string }> {
    const { data } = await api.post<ApiEnvelope<User>>('/me/email', { email, current_password: currentPassword })
    return { user: data.data, message: data.message ?? '' }
  },

  async resendEmailChange(): Promise<string> {
    const { data } = await api.post<{ message: string }>('/me/email/resend')
    return data.message
  },

  async cancelEmailChange(): Promise<User> {
    const { data } = await api.delete<ApiEnvelope<User>>('/me/email')
    return data.data
  },

  /** Change password; accounts without one (Google) omit current_password to set one. */
  async changePassword(input: { current_password?: string; password: string; password_confirmation: string }): Promise<string> {
    const { data } = await api.put<{ message: string }>('/me/password', input)
    return data.message
  },
}
