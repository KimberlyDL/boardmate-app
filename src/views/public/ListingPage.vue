<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <!-- Photos, with the back button floating on top -->
      <div class="hero">
        <div v-if="listing?.photos.length" class="gallery">
          <img v-for="(url, i) in listing.photos" :key="url" :src="url" :alt="`Photo ${i + 1} of ${listing.photos.length}`" :loading="i === 0 ? 'eager' : 'lazy'" />
        </div>
        <div v-else class="placeholder"><ImageIcon :size="28" aria-hidden="true" /><span class="dl-eyebrow">No photos yet</span></div>
        <DlIconButton class="back" :icon="ChevronLeft" label="Back" @click="goBack" />
        <span v-if="(listing?.photos.length ?? 0) > 1" class="count dl-data">{{ listing!.photos.length }} PHOTOS</span>
      </div>

      <div v-if="loading" class="narrow ion-padding body">
        <DlSkeleton width="40%" :height="12" />
        <DlSkeleton width="80%" :height="28" />
        <DlSkeleton width="60%" :height="14" />
        <div class="grid2"><DlSkeleton :height="88" :radius="18" tone="brand" /><DlSkeleton :height="88" :radius="18" /></div>
      </div>
      <div v-else-if="loadError" class="narrow ion-padding body">
        <DlCard>
          <DlEmptyState note="this place isn't listed" :icon="House" action-label="Back to search" to="/find">{{ loadError }}</DlEmptyState>
        </DlCard>
      </div>

      <div v-else-if="listing" class="narrow ion-padding body">
        <header class="title-block">
          <div class="tags">
            <DlStatusTag :tone="listing.is_full ? 'neutral' : 'success'">{{ listing.is_full ? 'Full right now' : listing.availability.label }}</DlStatusTag>
            <DlStatusTag v-if="listing.who_can_apply" tone="info">{{ listing.who_can_apply }}</DlStatusTag>
          </div>
          <h1 class="dl-h1">{{ listing.name }}</h1>
          <span class="dl-small">{{ listing.type_label }} · {{ area }}</span>
        </header>

        <div class="grid2">
          <DlStatCard
            label="Rent from"
            :value="listing.price_from_centavos !== null ? peso(listing.price_from_centavos).replace('.00', '') : 'Ask'"
            caption="per month"
          />
          <DlStatCard
            label="Available"
            :value="`${listing.availability.available}/${listing.availability.total}`"
            :caption="listing.rental_mode === 'whole' ? 'rooms free' : 'places free'"
            :tone="listing.is_full ? 'clay' : 'sky'"
          />
        </div>

        <!-- My application -->
        <DlCard v-if="mine" :tone="mine.status === 'approved' ? 'pine' : 'muted'" class="mine">
          <span class="dl-eyebrow">YOUR APPLICATION</span>
          <strong class="dl-title">{{ mine.status_label }}</strong>
          <p v-if="mine.status === 'approved'" class="dl-small mine-copy">
            {{ mine.unit?.label }} is reserved for you until {{ manilaDate(mine.reserved_until!).format('MMM D, YYYY') }}.
          </p>
          <p v-else class="dl-small mine-copy">You applied for move-in on {{ manilaDate(mine.planned_move_in_on).format('MMM D, YYYY') }}.</p>
          <ion-button size="small" class="dl-tonal" router-link="/boarder/bookings">My bookings</ion-button>
        </DlCard>
        <DlBanner v-else-if="listing.is_full" tone="warning" title="Full right now">
          Every room here is taken. Check again later, or find a place with a free room nearby.
        </DlBanner>

        <DlSection v-if="listing.description" title="About this place">
          <p class="dl-body description">{{ listing.description }}</p>
        </DlSection>

        <DlSection title="Rooms & availability">
          <listing-rooms :rooms="listing.rooms" :apply-href="mine ? null : `/listings/${listing.id}/apply`" />
          <p v-if="listing.rental_mode !== 'whole'" class="dl-small">The owner assigns your bedspace when approving.</p>
        </DlSection>

        <DlSection title="Utilities">
          <DlCard padding="4px 16px">
            <DlListRow
              v-for="(u, i) in listing.utilities"
              :key="u.type + u.name"
              :icon="utilityIcon(u.type)"
              :title="u.name"
              :subtitle="utilityText(u)"
              :divider="i > 0"
            />
            <DlListRow v-if="!listing.utilities.length" :icon="Info" title="Ask the owner" subtitle="No utilities listed yet" />
          </DlCard>
        </DlSection>

        <DlSection title="Good to know">
          <DlCard padding="4px 16px">
            <DlListRow :icon="Wallet" title="Deposit" :trailing="depositText" />
            <DlListRow :icon="Clock" title="Curfew" :trailing="listing.curfew_time ? clockTime(listing.curfew_time) : 'None'" divider />
            <DlListRow :icon="UserRound" title="Owner" :trailing="listing.owner_name" divider />
          </DlCard>
        </DlSection>

        <DlSection v-if="listing.house_rules" title="House rules">
          <DlCard>
            <house-rules-list :rules="listing.house_rules.rules" />
          </DlCard>
          <p class="dl-small">You accept these when you apply.</p>
        </DlSection>

        <DlSection title="Location">
          <p class="dl-body location">{{ listing.street ? `${listing.street}, ${area}` : area }}</p>
          <p v-if="!listing.street" class="dl-small">The exact address is shared once your booking is approved.</p>
          <listing-map v-if="listing.latitude !== null" :listings="[listing]" height="240px" />
        </DlSection>
      </div>
    </ion-content>

    <!-- Sticky action: price + Apply -->
    <ion-footer v-if="listing && !mine && !listing.is_full" class="action-footer">
      <div class="footer-inner">
        <div class="footer-price">
          <span class="price">{{ listing.price_from_centavos !== null ? `from ${peso(listing.price_from_centavos).replace('.00', '')}` : 'Price on request' }}</span>
          <span class="dl-small">{{ listing.availability.label }}</span>
        </div>
        <ion-button :router-link="`/listings/${listing.id}/apply`" class="apply">Apply</ion-button>
      </div>
    </ion-footer>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonFooter, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { ChevronLeft, Clock, Droplets, House, Image as ImageIcon, Info, Receipt, UserRound, Wallet, Wifi, Zap } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ListingMap from '@/components/ListingMap.vue'
import HouseRulesList from '@/components/houseRules/HouseRulesList.vue'
import ListingRooms from '@/components/rooms/ListingRooms.vue'
import { DlBanner, DlCard, DlEmptyState, DlIconButton, DlListRow, DlSection, DlSkeleton, DlStatCard, DlStatusTag } from '@/components/dl'
import { clockTime, manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { errorMessage } from '@/services/api'
import { listingService } from '@/services/listings'
import type { BookingApplication, ListingDetail } from '@/types/booking'

const route = useRoute()
const ionRouter = useIonRouter()
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

function goBack() {
  if (ionRouter.canGoBack()) ionRouter.back()
  else ionRouter.navigate('/find', 'back', 'replace')
}

function utilityIcon(type: string) {
  return ({ water: Droplets, electricity: Zap, internet: Wifi } as Record<string, typeof Wifi>)[type] ?? Receipt
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
.hero {
  position: relative;
  height: 280px;
  background: var(--bg-muted);
}
.gallery {
  display: flex;
  height: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}
.gallery::-webkit-scrollbar {
  display: none;
}
.gallery img {
  flex: 0 0 100%;
  height: 100%;
  object-fit: cover;
  scroll-snap-align: start;
}
.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  color: var(--text-muted);
  background: repeating-linear-gradient(135deg, var(--bg-muted) 0 12px, var(--skeleton-neutral) 12px 24px);
}
.back {
  position: absolute;
  top: calc(var(--ion-safe-area-top, 0px) + 16px);
  left: 16px;
}
.count {
  position: absolute;
  right: 16px;
  bottom: 16px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  background: var(--bg-ink);
  color: var(--text-on-ink);
}
.body {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 20px;
}
.title-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.grid2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--card-gap);
}
.mine {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}
.mine-copy {
  margin: 0 0 4px;
  color: inherit;
}
.mine ion-button {
  margin: 0;
}
.description {
  margin: 0;
  white-space: pre-wrap;
  color: var(--text-secondary);
}
.location {
  margin: 0;
}
.dl-section {
  margin-bottom: 0;
}
.action-footer {
  box-shadow: none;
}
.footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  max-width: 480px;
  margin: 0 auto;
  padding: 12px 16px calc(var(--ion-safe-area-bottom, 0px) + 12px);
  border-top: 1px solid var(--border-default);
  background: var(--bg-surface);
}
.footer-price {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.price {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--brand-primary);
}
.apply {
  min-width: 120px;
  height: 52px;
  margin: 0;
  font-size: 16px;
}
</style>
