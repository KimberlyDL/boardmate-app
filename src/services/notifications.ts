import { api } from './api'
import type { ApiEnvelope } from '@/types/api'
import type { AppNotification, NotificationPreference } from '@/types/user'

export interface NotificationPageMeta {
  current_page: number
  last_page: number
  total: number
  unread_count: number
}

/** Notifications module (client side): in-app list, unread count, preferences. */
export const notificationService = {
  async list(page = 1): Promise<{ items: AppNotification[]; meta: NotificationPageMeta }> {
    const { data } = await api.get<ApiEnvelope<AppNotification[], NotificationPageMeta>>('/notifications', { params: { page } })
    return { items: data.data, meta: data.meta as NotificationPageMeta }
  },

  async unreadCount(): Promise<number> {
    const { data } = await api.get<ApiEnvelope<{ unread_count: number }>>('/notifications/unread-count')
    return data.data.unread_count
  },

  async markRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`)
  },

  async markAllRead(): Promise<void> {
    await api.post('/notifications/read-all')
  },

  /** Remove one from my list. */
  async remove(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`)
  },

  /** Empty my list (or only the ones already read). */
  async clear(readOnly = false): Promise<void> {
    await api.post('/notifications/clear', { read_only: readOnly })
  },

  async preferences(): Promise<NotificationPreference[]> {
    const { data } = await api.get<ApiEnvelope<NotificationPreference[]>>('/me/notification-preferences')
    return data.data
  },

  async updatePreferences(muted: string[]): Promise<NotificationPreference[]> {
    const { data } = await api.put<ApiEnvelope<NotificationPreference[]>>('/me/notification-preferences', { muted })
    return data.data
  },
}
