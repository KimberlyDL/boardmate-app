<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Notifications</ion-title>
        <ion-buttons slot="end">
          <ion-button :disabled="!store.unreadCount" @click="store.markAllRead()">Mark all read</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <p v-if="!store.loading && !store.items.length" class="ion-padding muted center">No notifications yet.</p>

        <ion-list>
          <ion-item
            v-for="n in store.items"
            :key="n.id"
            button
            :detail="!!n.action_url"
            :class="{ unread: !n.read_at }"
            @click="open(n)"
          >
            <ion-label class="ion-text-wrap">
              <h2>{{ n.title }}</h2>
              <p>{{ n.body }}</p>
              <p class="muted">{{ manila(n.created_at).format('MMM D, h:mm A') }}</p>
            </ion-label>
            <ion-note v-if="!n.read_at" slot="end" color="primary">New</ion-note>
          </ion-item>
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
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { useRouter } from 'vue-router'
import { manila } from '@/lib/dayjs'
import { useNotificationStore } from '@/stores/notifications'
import type { AppNotification } from '@/types/user'

const store = useNotificationStore()
const router = useRouter()

onIonViewWillEnter(() => store.load())

async function refresh(event: RefresherCustomEvent) {
  await store.load()
  event.target.complete()
}

async function loadMore(event: InfiniteScrollCustomEvent) {
  await store.load(false)
  event.target.complete()
}

async function open(n: AppNotification) {
  await store.markRead(n)
  if (n.action_url) await router.push(n.action_url)
}
</script>

<style scoped>
.unread h2 {
  font-weight: 600;
}
</style>
