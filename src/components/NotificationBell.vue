<template>
  <DlIconButton :icon="Bell" label="Notifications" :badge="notifications.unreadCount" :variant="variant" :to="`${auth.homePath}/notifications`" />
</template>

<script setup lang="ts">
import { Bell } from 'lucide-vue-next'
import { onMounted } from 'vue'
import DlIconButton from '@/components/dl/DlIconButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'

/** The bell on every tab's main screen: opens Notifications and shows the unread count. */
withDefaults(defineProps<{ variant?: 'surface' | 'ghost' }>(), { variant: 'ghost' })

const auth = useAuthStore()
const notifications = useNotificationStore()
onMounted(() => notifications.refreshCount())
</script>
