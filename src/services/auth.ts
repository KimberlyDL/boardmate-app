import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { User } from '@/types/user'

export interface AuthResult {
  token: string
  user: User
}

export interface RegisterInput {
  name: string
  email: string
  phone?: string
  password: string
  password_confirmation: string
  consent: boolean
}

export interface ResetPasswordInput {
  token: string
  email: string
  password: string
  password_confirmation: string
}

const DEVICE_NAME = 'boardmate-app'

export const authService = {
  /** Creates the account and emails a confirmation link. Does not log in. */
  async register(input: RegisterInput): Promise<{ email: string; message: string }> {
    const { data } = await api.post<ApiEnvelope<{ email: string }>>('/auth/register', input)
    return { email: data.data.email, message: data.message ?? '' }
  },

  async login(email: string, password: string): Promise<AuthResult> {
    const { data } = await api.post<ApiEnvelope<AuthResult>>('/auth/login', { email, password, device_name: DEVICE_NAME })
    return data.data
  },

  /**
   * Sign in with a Google ID token. A new person without consent gets a 409
   * with code "consent_required" (see errorCode()).
   */
  async google(idToken: string, consent = false): Promise<AuthResult> {
    const { data } = await api.post<ApiEnvelope<AuthResult>>('/auth/google', {
      id_token: idToken,
      consent,
      device_name: DEVICE_NAME,
    })
    return data.data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async forgotPassword(email: string): Promise<string> {
    const { data } = await api.post<{ message: string }>('/auth/forgot-password', { email })
    return data.message
  },

  async resetPassword(input: ResetPasswordInput): Promise<string> {
    const { data } = await api.post<{ message: string }>('/auth/reset-password', input)
    return data.message
  },

  /** Resend the sign-up confirmation link (no login needed). */
  async resendConfirmation(email: string): Promise<string> {
    const { data } = await api.post<{ message: string }>('/auth/email/resend', { email })
    return data.message
  },
}
