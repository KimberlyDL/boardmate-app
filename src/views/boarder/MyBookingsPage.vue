<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>My bookings</ion-title>
        <ion-buttons slot="end">
          <DlIconButton :icon="Search" label="Find a place" variant="ghost" to="/find" />
          <NotificationBell />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow page">
        <template v-if="loading && !items.length">
          <DlSkeleton v-for="n in 2" :key="n" :height="150" :radius="18" />
        </template>

        <DlCard v-else-if="!items.length">
          <DlEmptyState note="no applications yet" :icon="Bookmark" action-label="Find a place" to="/find">
            Apply to a place and you can follow it here.
          </DlEmptyState>
        </DlCard>

        <DlCard v-for="a in items" :key="a.id" :tone="a.status === 'approved' ? 'pine' : 'surface'" class="app">
          <div class="head">
            <img v-if="a.property.cover_photo_url" :src="a.property.cover_photo_url" alt="" class="thumb" />
            <span v-else class="thumb placeholder" aria-hidden="true"><House :size="20" /></span>
            <div class="who">
              <DlStatusTag :tone="statusTone[a.status] ?? 'neutral'">{{ a.status_label }}</DlStatusTag>
              <span class="dl-title">{{ a.property.name }}</span>
              <span class="dl-small place">{{ a.property.address ?? a.property.area }}</span>
            </div>
          </div>

          <p v-if="a.status === 'approved'" class="body">
            <strong>{{ a.unit?.room_label ? `Room ${a.unit.room_label} · ` : '' }}{{ a.unit?.label }}</strong> · {{ peso(a.unit?.rent_centavos) }} / month<br />
            <template v-if="a.room && a.unit?.room_id !== a.room.id">The owner placed you here instead of room {{ a.room.label }}.<br /></template>
            Reserved until <strong>{{ manilaDate(a.reserved_until!).format('MMM D, YYYY') }}</strong>. Move in by then and bring
            the deposit and first month's rent.
          </p>
          <p v-else-if="a.status === 'pending'" class="body">
            <template v-if="a.room">Room {{ a.room.label }} · </template>Move-in {{ manilaDate(a.planned_move_in_on).format('MMM D, YYYY') }}. Waiting for
            the owner.
          </p>
          <p v-if="a.closed_reason" class="body soft">{{ a.closed_reason }}</p>
          <p class="dl-data meta">Applied {{ manila(a.created_at).format('D MMM YYYY') }} · Owner: {{ a.property.owner_name }}</p>

          <div class="actions">
            <ion-button size="small" class="dl-tonal" :router-link="`/listings/${a.property.id}`">View listing</ion-button>
            <ion-button v-if="a.can_cancel" size="small" fill="outline" @click="cancel(a)">
              {{ a.status === 'approved' ? 'Cancel reservation' : 'Withdraw' }}
            </ion-button>
          </div>
        </DlCard>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Bookmark, House, Search } from 'lucide-vue-next'
import { ref } from 'vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { DlCard, DlEmptyState, DlIconButton, DlRefresher, DlSkeleton, DlStatusTag } from '@/components/dl'
import { manila, manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import type { TagTone } from '@/lib/tones'
import { errorMessage } from '@/services/api'
import { bookingService } from '@/services/bookings'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { BookingApplication } from '@/types/booking'

const toast = useToast()
const prompt = usePrompt()
const items = ref<BookingApplication[]>([])
const loading = ref(true)

const statusTone: Record<string, TagTone> = {
  pending: 'warning',
  approved: 'success',
  moved_in: 'brand',
  declined: 'danger',
  cancelled: 'neutral',
  expired: 'neutral',
}

async function load() {
  try {
    items.value = (await bookingService.mine()).items
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

async function cancel(a: BookingApplication) {
  const reserved = a.status === 'approved'
  if (!(await prompt.confirm(reserved ? 'Cancel reservation?' : 'Withdraw application?', reserved ? `${a.unit?.label} at ${a.property.name} will be offered to others.` : `Your application for ${a.property.name} will be withdrawn.`, reserved ? 'Cancel reservation' : 'Withdraw'))) return
  try {
    await bookingService.cancelMine(a.id)
    toast.success('Cancelled.')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}
.app {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.thumb {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-md);
  object-fit: cover;
}
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-muted);
  color: var(--text-muted);
}
.who {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 0;
}
.place {
  color: inherit;
  opacity: 0.85;
}
.body {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}
.soft {
  opacity: 0.8;
}
.meta {
  margin: 0;
  text-transform: uppercase;
  opacity: 0.75;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.actions ion-button {
  margin: 0;
}
</style>
