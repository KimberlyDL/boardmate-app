<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/find" /></ion-buttons>
        <ion-title>{{ listing?.name ?? 'Listing' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <p v-if="loading" class="ion-padding muted">Loading…</p>
      <div v-else-if="loadError" class="ion-padding narrow">
        <p>{{ loadError }}</p>
        <ion-button router-link="/find">Back to search</ion-button>
      </div>

      <template v-else-if="listing">
        <div class="gallery">
          <img v-for="(url, i) in listing.photos" :key="url" :src="url" :alt="`Photo ${i + 1}`" :loading="i === 0 ? 'eager' : 'lazy'" />
        </div>

        <div class="narrow ion-padding">
          <p class="muted">{{ listing.type_label }} · {{ area }}</p>
          <h1>{{ listing.name }}</h1>
          <p class="price">
            <strong>{{ listing.price_from_centavos !== null ? `from ${peso(listing.price_from_centavos)}` : 'Price on request' }}</strong> / month
            · {{ listing.availability.label }}
          </p>
          <p v-if="listing.who_can_apply"><ion-chip>{{ listing.who_can_apply }}</ion-chip></p>

          <!-- My application, or Apply -->
          <ion-card v-if="mine" :color="mine.status === 'approved' ? 'success' : 'light'">
            <ion-card-content>
              <strong>{{ mine.status_label }}</strong>
              <p v-if="mine.status === 'approved'">
                {{ mine.unit?.label }} is reserved for you until {{ manilaDate(mine.reserved_until!).format('MMM D, YYYY') }}.
              </p>
              <p v-else>You applied for move-in on {{ manilaDate(mine.planned_move_in_on).format('MMM D, YYYY') }}.</p>
              <ion-button size="small" fill="outline" color="dark" router-link="/boarder/bookings">My bookings</ion-button>
            </ion-card-content>
          </ion-card>
          <ion-button v-else expand="block" :router-link="`/listings/${listing.id}/apply`">Apply</ion-button>

          <p v-if="listing.description" class="description">{{ listing.description }}</p>

          <h3>Available now</h3>
          <ion-list lines="inset">
            <ion-item v-for="s in listing.slots" :key="s.id">
              <ion-label>
                {{ s.label }}<span v-if="s.kind === 'whole'"> · up to {{ s.capacity }} people</span>
              </ion-label>
              <ion-note slot="end">{{ peso(s.rent_centavos) }}</ion-note>
            </ion-item>
          </ion-list>
          <p v-if="listing.rental_mode === 'bedspaces'" class="muted small">The owner assigns your bedspace when approving.</p>

          <h3>Utilities</h3>
          <ion-list lines="inset">
            <ion-item v-for="u in listing.utilities" :key="u.type + u.name">
              <ion-label class="ion-text-wrap">
                <h2>{{ u.name }}</h2>
                <p>{{ utilityText(u) }}</p>
              </ion-label>
            </ion-item>
            <ion-item v-if="!listing.utilities.length"><ion-label class="muted">Ask the owner.</ion-label></ion-item>
          </ion-list>

          <h3>Good to know</h3>
          <ion-list lines="inset">
            <ion-item>
              <ion-label>Deposit</ion-label>
              <ion-note slot="end">{{ depositText }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Curfew</ion-label>
              <ion-note slot="end">{{ listing.curfew_time ? clockTime(listing.curfew_time) : 'None' }}</ion-note>
            </ion-item>
            <ion-item>
              <ion-label>Owner</ion-label>
              <ion-note slot="end">{{ listing.owner_name }}</ion-note>
            </ion-item>
          </ion-list>

          <h3>Location</h3>
          <p>{{ listing.street ? `${listing.street}, ${area}` : area }}</p>
          <p v-if="!listing.street" class="muted small">The exact address is shared once your booking is approved.</p>
          <listing-map v-if="listing.latitude !== null" :listings="[listing]" height="240px" />
        </div>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonChip,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ListingMap from '@/components/ListingMap.vue'
import { clockTime, manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { errorMessage } from '@/services/api'
import { listingService } from '@/services/listings'
import type { BookingApplication, ListingDetail } from '@/types/booking'

const route = useRoute()
const id = Number(route.params.id)

const listing = ref<ListingDetail | null>(null)
const mine = ref<BookingApplication | null>(null)
const loading = ref(true)
const loadError = ref('')

const area = computed(() => [listing.value?.barangay, listing.value?.city, listing.value?.province].filter(Boolean).join(', '))

const depositText = computed(() => {
  const d = listing.value?.deposit
  if (!d?.rule) return '—'
  if (d.rule === 'fixed_amount') return peso(d.fixed_centavos)
  return d.label ?? '—'
})

function utilityText(u: ListingDetail['utilities'][number]): string {
  if (u.billed_by === 'group') return 'Shared and paid by the boarders themselves'
  if (u.method === 'included') return 'Included in the rent'
  if (u.method === 'actual_bill') return 'Your share of the actual bill'
  return `${u.method_label}: ${peso(u.amount_centavos)} / month`
}

onIonViewWillEnter(async () => {
  try {
    const data = await listingService.get(id)
    listing.value = data.listing
    mine.value = data.my_application
  } catch (e) {
    loadError.value = errorMessage(e, 'This listing is not available.')
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.gallery {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  gap: 4px;
}
.gallery img {
  flex: 0 0 100%;
  max-height: 320px;
  object-fit: cover;
  scroll-snap-align: start;
}
h1 {
  margin: 4px 0;
}
h3 {
  margin-top: 24px;
}
.price {
  font-size: 1.05rem;
}
.description {
  white-space: pre-wrap;
  margin-top: 16px;
}
.small {
  font-size: 0.85rem;
}
</style>
