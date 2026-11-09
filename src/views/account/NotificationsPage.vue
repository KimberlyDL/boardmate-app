<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button :default-href="auth.homePath" />
        </ion-buttons>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="!store.unreadCount" @click="store.markAllRead()">Mark all read</ion-button>
          <ion-button :disabled="!store.items.length" @click="askClear">Clear</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <DlCard v-if="!store.loading && !store.items.length">
          <DlEmptyState note="you're all caught up" :icon="Bell">No notifications yet.</DlEmptyState>
        </DlCard>

        <ion-list v-else lines="full">
          <ion-item-sliding v-for="n in store.items" :key="n.id">
            <ion-item
            button
            :detail="!!n.action_url"
            :class="{ unread: !n.read_at }"
            @click="open(n)"
          >
            <span slot="start" class="dot" :class="{ on: !n.read_at }" aria-hidden="true" />
            <ion-label class="ion-text-wrap">
              <h2>{{ n.title }}</h2>
              <p>{{ n.body }}</p>
              <p class="when">{{ manila(n.created_at).format('D MMM · h:mm A') }}</p>
            </ion-label>
            <DlStatusTag v-if="!n.read_at" slot="end" status="new" />
            <ion-button slot="end" fill="clear" size="small" class="clear-one" aria-label="Clear this notification" @click.stop="clearOne(n)">
              <X :size="16" aria-hidden="true" />
            </ion-button>
          </ion-item>
          <ion-item-options side="end" @ion-swipe="clearOne(n)">
            <ion-item-option color="danger" expandable @click="clearOne(n)">Clear</ion-item-option>
          </ion-item-options>
          </ion-item-sliding>
        </ion-list>

        <ion-infinite-scroll :disabled="store.page >= store.lastPage" @ion-infinite="loadMore">
          <ion-infinite-scroll-content />
        </ion-infinite-scroll>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type InfiniteScrollCustomEvent,
  type RefresherCustomEvent,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  alertController,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Bell, X } from 'lucide-vue-next'
import { DlCard, DlEmptyState, DlStatusTag } from '@/components/dl'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { manila } from '@/lib/dayjs'
import { useAuthStore } from '@/stores/auth'
import { useNotificationStore } from '@/stores/notifications'
import type { AppNotification } from '@/types/user'

const store = useNotificationStore()
const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

onIonViewWillEnter(() => store.load())

async function refresh(event: RefresherCustomEvent) {
  await store.load()
  event.target.complete()
}

async function loadMore(event: InfiniteScrollCustomEvent) {
  await store.load(false)
  event.target.complete()
}

async function clearOne(n: AppNotification) {
  try {
    await store.remove(n)
  } catch {
    toast.error('Could not clear it. Try again.')
  }
}

/** Clear the read ones, or everything. Nothing else is deleted: bills, requests and the rest stay. */
async function askClear() {
  const alert = await alertController.create({
    header: 'Clear notifications',
    message: 'This only empties your list. Your bills, requests and records are not affected.',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Clear read ones', role: 'read' },
      { text: 'Clear all', role: 'all' },
    ],
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  if (role !== 'read' && role !== 'all') return
  try {
    await store.clear(role === 'read')
  } catch {
    toast.error('Could not clear them. Try again.')
  }
}

async function open(n: AppNotification) {
  await store.markRead(n)
  if (n.action_url) await router.push(n.action_url)
}
</script>

<style scoped>
.unread {
  --background: var(--brand-primary-subtle);
}
.dot {
  width: 8px;
  height: 8px;
  margin-right: 4px;
  border-radius: var(--radius-full);
  background: transparent;
}
.dot.on {
  background: var(--brand-primary);
}
.clear-one {
  --padding-start: 6px;
  --padding-end: 6px;
  color: var(--text-muted, inherit);
}
.when {
  font-family: var(--font-mono);
  font-size: 11px !important;
  text-transform: uppercase;
}
.unread h2 {
  font-weight: 600;
}
</style>
