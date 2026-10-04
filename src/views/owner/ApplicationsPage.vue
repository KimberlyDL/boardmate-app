<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Applications</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="status" :scrollable="true" @ion-change="setStatus(String($event.detail.value))">
          <ion-segment-button value="pending"><ion-label>Pending ({{ store.pendingCount }})</ion-label></ion-segment-button>
          <ion-segment-button value="approved"><ion-label>Reserved</ion-label></ion-segment-button>
          <ion-segment-button value="declined"><ion-label>Declined</ion-label></ion-segment-button>
          <ion-segment-button value="cancelled"><ion-label>Cancelled</ion-label></ion-segment-button>
          <ion-segment-button value="expired"><ion-label>Expired</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <p v-if="!loading && !items.length" class="muted center">Nothing here.</p>

        <ion-card v-for="a in items" :key="a.id">
          <ion-card-header>
            <ion-card-subtitle>{{ a.property.name }}{{ a.unit ? ` · ${a.unit.label}` : '' }}</ion-card-subtitle>
            <ion-card-title>{{ a.applicant?.name }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ a.applicant?.phone }} · {{ a.applicant?.email }}</p>
            <p>Move-in <strong>{{ manilaDate(a.planned_move_in_on).format('MMM D, YYYY') }}</strong> · applied {{ manila(a.created_at).format('MMM D') }}</p>
            <p v-if="a.message" class="message">“{{ a.message }}”</p>
            <p v-if="a.id_document_url"><a :href="a.id_document_url" target="_blank" rel="noopener">View ID</a></p>
            <p v-else-if="a.id_document_purged" class="muted small">ID deleted (30 days after closing)</p>
            <p v-if="a.status === 'approved'">
              Reserved until <strong>{{ manilaDate(a.reserved_until!).format('MMM D, YYYY') }}</strong>
              <span v-if="a.decided_by"> · approved by {{ a.decided_by }}</span>
            </p>
            <p v-if="a.closed_reason" class="muted">{{ a.closed_reason }}</p>

            <template v-if="a.status === 'pending'">
              <ion-button size="small" @click="approve(a)">Approve</ion-button>
              <ion-button size="small" fill="outline" color="medium" @click="decline(a)">Decline</ion-button>
            </template>
            <ion-button v-if="a.status === 'approved'" size="small" fill="outline" color="danger" @click="cancel(a)">
              Cancel reservation
            </ion-button>
          </ion-card-content>
        </ion-card>

        <ion-infinite-scroll :disabled="page >= lastPage" @ion-infinite="more">
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
  alertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { ref } from 'vue'
import { manila, manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { errorMessage, fieldErrors } from '@/services/api'
import { bookingService } from '@/services/bookings'
import { useBookingStore } from '@/stores/bookings'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { BookingApplication } from '@/types/booking'

/** Owner and Manager caretakers: review applications for the properties they run. */
const toast = useToast()
const prompt = usePrompt()
const store = useBookingStore()

const status = ref('pending')
const items = ref<BookingApplication[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)

async function load(reset = true) {
  loading.value = true
  try {
    const { items: found, meta } = await bookingService.list(status.value, undefined, reset ? 1 : page.value + 1)
    items.value = reset ? found : [...items.value, ...found]
    page.value = meta.current_page
    lastPage.value = meta.last_page
    store.pendingCount = meta.pending_count
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(() => load())

function setStatus(value: string) {
  status.value = value
  load()
}

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}

async function more(event: InfiniteScrollCustomEvent) {
  await load(false)
  event.target.complete()
}

async function approve(a: BookingApplication) {
  try {
    const { units } = await bookingService.get(a.id)
    if (!units.length) return toast.error('No unit is free right now. Free one up or decline.')
    const alert = await alertController.create({
      header: `Reserve for ${a.applicant?.name}`,
      message: units.length > 1 ? 'Choose the bedspace.' : 'This unit will be reserved.',
      inputs: units.map((u, i) => ({ type: 'radio' as const, label: `${u.label} · ${peso(u.rent_centavos)}`, value: u.id, checked: i === 0 })),
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Approve', role: 'confirm' }],
    })
    await alert.present()
    const { role, data } = await alert.onDidDismiss()
    if (role !== 'confirm' || !data?.values) return
    toast.success(await bookingService.approve(a.id, Number(data.values)))
    await load()
  } catch (e) {
    toast.error(Object.values(fieldErrors(e))[0]?.[0] ?? errorMessage(e))
  }
}

async function decline(a: BookingApplication) {
  const alert = await alertController.create({
    header: 'Decline application',
    message: `${a.applicant?.name} will be told. A reason is optional.`,
    inputs: [{ name: 'reason', type: 'textarea', placeholder: 'Reason (optional)' }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Decline', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  try {
    await bookingService.decline(a.id, (data?.values?.reason ?? '').trim() || undefined)
    toast.info('Declined.')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function cancel(a: BookingApplication) {
  const reason = await prompt.reason('Cancel reservation', `${a.unit?.label} becomes available again. ${a.applicant?.name} will be told why.`, 'Cancel reservation')
  if (!reason) return
  try {
    await bookingService.cancelReservation(a.id, reason)
    toast.info('Reservation cancelled.')
    await load()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.message {
  font-style: italic;
}
.small {
  font-size: 0.85rem;
}
</style>
