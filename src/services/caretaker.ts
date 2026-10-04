import { Preferences } from '@capacitor/preferences'
import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { CaretakerLink, InvitationDetails } from '@/types/roles'
import type { User } from '@/types/user'

const PENDING_INVITE_KEY = 'boardmate.pendingInvite'

export const caretakerService = {
  async invitation(token: string): Promise<InvitationDetails> {
    const { data } = await api.get<ApiEnvelope<InvitationDetails>>(`/caretaker-invitations/${token}`)
    return data.data
  },

  async accept(token: string): Promise<{ user: User; message: string }> {
    const { data } = await api.post<ApiEnvelope<User>>(`/caretaker-invitations/${token}/accept`)
    return { user: data.data, message: data.message ?? '' }
  },

  async decline(token: string): Promise<string> {
    const { data } = await api.post<{ message: string }>(`/caretaker-invitations/${token}/decline`)
    return data.message
  },

  /** Owners I work for. */
  async employers(): Promise<CaretakerLink[]> {
    const { data } = await api.get<ApiEnvelope<CaretakerLink[]>>('/caretaker/owners')
    return data.data
  },

  /**
   * Remembers an invitation opened while signed out, so the person lands back
   * on it after signing up, confirming their email and logging in.
   */
  pendingInvite: {
    async get(): Promise<string | null> {
      return (await Preferences.get({ key: PENDING_INVITE_KEY })).value
    },
    async set(token: string): Promise<void> {
      await Preferences.set({ key: PENDING_INVITE_KEY, value: token })
    },
    async clear(): Promise<void> {
      await Preferences.remove({ key: PENDING_INVITE_KEY })
    },
  },
}
