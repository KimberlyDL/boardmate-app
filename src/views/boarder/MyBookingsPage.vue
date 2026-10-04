<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>My bookings</ion-title>
        <ion-buttons slot="end">
          <ion-button router-link="/find" aria-label="Find a place"><ion-icon slot="icon-only" :icon="searchOutline" /></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <template v-if="!loading && !items.length">
          <p class="muted center">You have not applied anywhere yet.</p>
          <ion-button expand="block" router-link="/find">Find a place</ion-button>
        </template>

        <ion-card v-for="a in items" :key="a.id" :color="a.status === 'approved' ? 'success' : undefined">
          <img v-if="a.property.cover_photo_url" :src="a.property.cover_photo_url" alt="" class="cover" />
          <ion-card-header>
            <ion-card-subtitle>{{ a.status_label }}</ion-card-subtitle>
            <ion-card-title>{{ a.property.name }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ a.property.address ?? a.property.area }}</p>
            <p v-if="a.status === 'approved'">
              <strong>{{ a.unit?.label }}</strong> · {{ peso(a.unit?.rent_centavos) }} / month<br />
              Reserved until <strong>{{ manila(a.reserved_until!).format('MMM D, YYYY') }}</strong>. Move in by then and bring
              the deposit and first month's rent.
            </p>
            <p v-else-if="a.status === 'pending'">Move-in {{ manila(a.planned_move_in_on).format('MMM D, YYYY') }}. Waiting for the owner.</p>
            <p v-if="a.closed_reason" class="muted">{{ a.closed_reason }}</p>
            <p class="muted small">Applied {{ manila(a.created_at).format('MMM D, YYYY') }} · Owner: {{ a.property.owner_name }}</p>
            <ion-button v-if="a.can_cancel" size="small" fill="outline" color="dark" @click="cancel(a)">
              {{ a.status === 'approved' ? 'Cancel reservation' : 'Withdraw' }}
            </ion-button>
            <ion-button size="small" fill="clear" color="dark" :router-link="`/listings/${a.property.id}`">View listing</ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { searchOutline } from 'ionicons/icons'
import { ref } from 'vue'
import { manila } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { errorMessage } from '@/services/api'
import { bookingService } from '@/services/bookings'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { BookingApplication } from '@/types/booking'

const toast = useToast()
const prompt = usePrompt()
const items = ref<BookingApplication[]>([])
const loading = ref(true)

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

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}

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
.cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}
.small {
  font-size: 0.85rem;
}
</style>
