import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationService } from '@/services/notifications'
import type { AppNotification } from '@/types/user'

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([])
  const unreadCount = ref(0)
  const page = ref(1)
  const lastPage = ref(1)
  const loading = ref(false)

  async function refreshCount() {
    try {
      unreadCount.value = await notificationService.unreadCount()
    } catch {
      // The badge is not critical; keep the last known count.
    }
  }

  async function load(reset = true) {
    loading.value = true
    try {
      const next = reset ? 1 : page.value + 1
      const { items: fetched, meta } = await notificationService.list(next)
      items.value = reset ? fetched : [...items.value, ...fetched]
      page.value = meta.current_page
      lastPage.value = meta.last_page
      unreadCount.value = meta.unread_count
    } finally {
      loading.value = false
    }
  }

  async function markRead(notification: AppNotification) {
    if (notification.read_at) return
    await notificationService.markRead(notification.id)
    notification.read_at = new Date().toISOString()
    unreadCount.value = Math.max(0, unreadCount.value - 1)
  }

  async function markAllRead() {
    await notificationService.markAllRead()
    const now = new Date().toISOString()
    items.value.forEach((n) => (n.read_at ??= now))
    unreadCount.value = 0
  }

  function $reset() {
    items.value = []
    unreadCount.value = 0
    page.value = 1
    lastPage.value = 1
  }

  return { items, unreadCount, page, lastPage, loading, refreshCount, load, markRead, markAllRead, $reset }
})
