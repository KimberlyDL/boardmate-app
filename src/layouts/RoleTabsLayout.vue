<template>
  <ion-page>
    <ion-tabs>
      <ion-router-outlet />
      <!-- Desktop: the sidebar (components/AppSidebar.vue) replaces this bar; the tabs still drive navigation. -->
      <ion-tab-bar slot="bottom" class="role-tab-bar">
        <ion-tab-button v-for="t in tabs" :key="t.tab" :tab="t.tab" :href="t.href">
          <component :is="t.icon" class="tab-icon" :size="24" aria-hidden="true" />
          <ion-label>{{ t.label }}</ion-label>
          <ion-badge v-if="t.badge === 'applications' && bookings.pendingCount">
            {{ bookings.pendingCount }}
          </ion-badge>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBadge, IonLabel, IonPage, IonRouterOutlet, IonTabBar, IonTabButton, IonTabs } from '@ionic/vue'
import { onMounted } from 'vue'
import type { NavItem } from '@/lib/navigation'
import { useBookingStore } from '@/stores/bookings'
import { useNotificationStore } from '@/stores/notifications'

/**
 * One bottom-tab area per role; the tabs come from lib/navigation.ts through the route.
 * Notifications has no tab: it opens from the bell on each tab's main screen.
 */
const props = defineProps<{ tabs: NavItem[] }>()
const notifications = useNotificationStore()
const bookings = useBookingStore()
onMounted(() => {
  notifications.refreshCount()
  if (props.tabs.some((t) => t.badge === 'applications')) bookings.refreshPending()
})
</script>

<style scoped>
@media (min-width: 992px) {
  .role-tab-bar {
    display: none;
  }
}
</style>
