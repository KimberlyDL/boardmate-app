<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <ion-tab-bar slot="bottom">
        <ion-tab-button v-for="t in tabs" :key="t.tab" :tab="t.tab" :href="t.href">
          <component :is="t.icon" class="tab-icon" :size="24" aria-hidden="true" />
          <ion-label>{{ t.label }}</ion-label>
          <ion-badge v-if="t.tab === 'applications' && bookings.pendingCount">
            {{ bookings.pendingCount }}
          </ion-badge>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue'
import { type Component, onMounted } from 'vue'
import { useBookingStore } from '@/stores/bookings'
import { useNotificationStore } from '@/stores/notifications'

export interface RoleTab {
  tab: string
  href: string
  label: string
  /** A Lucide icon component. */
  icon: Component
}

/**
 * One bottom-tab area per role; the tabs come from the route (router/index.ts).
 * Notifications has no tab: it opens from the bell on each tab's main screen.
 */
const props = defineProps<{ tabs: RoleTab[] }>()
const notifications = useNotificationStore()
const bookings = useBookingStore()
onMounted(() => {
  notifications.refreshCount()
  if (props.tabs.some((t) => t.tab === 'applications')) bookings.refreshPending()
})
</script>
