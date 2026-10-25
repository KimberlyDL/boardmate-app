<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="auth.isLoggedIn ? auth.homePath : '/'" /></ion-buttons>
        <ion-title>Find a place</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          v-model="filters.q"
          :debounce="500"
          placeholder="City, barangay or name"
          @ion-input="search()"
        />
      </ion-toolbar>
      <ion-toolbar>
        <div class="bar">
          <ion-segment v-model="view" class="view-toggle" @ion-change="search()">
            <ion-segment-button value="map" aria-label="Map"><MapIcon :size="18" aria-hidden="true" /></ion-segment-button>
            <ion-segment-button value="list" aria-label="List"><List :size="18" aria-hidden="true" /></ion-segment-button>
          </ion-segment>
          <ion-button size="small" class="dl-tonal" @click="filtersOpen = true">
            <SlidersHorizontal slot="start" :size="16" aria-hidden="true" /> Filters{{ active ? ` · ${active}` : '' }}
          </ion-button>
          <ion-select v-model="filters.sort" interface="popover" aria-label="Sort" class="sort" @ion-change="search()">
            <ion-select-option v-if="distance.near.value" value="nearest">Nearest</ion-select-option>
            <ion-select-option value="newest">Newest</ion-select-option>
            <ion-select-option value="price">Lowest price</ion-select-option>
          </ion-select>
        </div>
        <div class="bar from">
          <DlChip :icon="MapPin" @click="chooseFrom">Distance from: {{ distance.label.value }}</DlChip>
          <ion-button v-if="picking" size="small" fill="clear" @click="picking = false">Cancel</ion-button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="narrow wide ion-padding">
        <p class="count">
          <span class="dl-title">{{ total }} {{ total === 1 ? 'place' : 'places' }}</span>
          <span v-if="filters.bbox" class="dl-small"> in this map area · <a href="#" @click.prevent="clearArea">clear area</a></span>
        </p>

        <template v-if="view === 'map'">
          <listing-map
            :listings="items"
            :selected-id="selected?.id ?? null"
            :origin="origin"
            :picking="picking"
            searchable
            height="58vh"
            @select="select"
            @search-area="searchArea"
            @pick="pickPoint"
          />
          <p class="legend dl-small">
            <span class="key free" /> Has free rooms <span class="key full" /> Full right now
            <span class="key origin" /> {{ distance.label.value }}
          </p>

          <DlCard v-if="selected" class="pin-card" :padding="12">
            <DlListingCard
              :title="selected.name"
              :eyebrow="placeLine(selected)"
              :price="priceOf(selected)"
              :full="selected.is_full"
              :image-src="selected.cover_photo_url"
              :meta="[distanceLine(selected), selected.availability.label]"
            />
            <div class="card-actions">
              <ion-button @click="viewRooms(selected.id)"><BedDouble slot="start" :size="18" aria-hidden="true" /> View rooms</ion-button>
              <ion-button class="dl-tonal" @click="open(selected.id)">Details</ion-button>
            </div>
          </DlCard>
        </template>

        <template v-else>
          <div v-if="loading && !items.length" class="cards">
            <DlCard v-for="n in 3" :key="n" :padding="10" class="skeleton-card">
              <DlSkeleton :width="104" :height="104" :radius="12" />
              <div class="skeleton-lines">
                <DlSkeleton width="70%" :height="16" />
                <DlSkeleton width="40%" :height="18" tone="brand" />
                <DlSkeleton width="85%" :height="12" />
              </div>
            </DlCard>
          </div>
          <DlCard v-else-if="!items.length">
            <DlEmptyState note="no places match yet" :icon="MapIcon" action-label="Clear filters" @action="clearFilters">
              Try fewer filters or another area.
            </DlEmptyState>
          </DlCard>
          <div v-else class="cards">
            <DlListingCard
              v-for="l in items"
              :key="l.id"
              :title="l.name"
              :eyebrow="placeLine(l)"
              :price="priceOf(l)"
              :full="l.is_full"
              :image-src="l.cover_photo_url"
              :meta="[distanceLine(l), l.availability.label]"
              @click="open(l.id)"
            >
              <DlChip v-for="u in l.included_utilities" :key="u" variant="amenity">{{ u }} included</DlChip>
              <DlChip v-if="l.who_can_apply" variant="amenity">{{ l.who_can_apply }}</DlChip>
            </DlListingCard>
          </div>
          <ion-infinite-scroll :disabled="page >= lastPage" @ion-infinite="more">
            <ion-infinite-scroll-content />
          </ion-infinite-scroll>
        </template>
      </div>

      <!-- Rooms & availability of the tapped place -->
      <ion-modal :is-open="!!roomsOf" @did-dismiss="roomsOf = null">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ roomsOf?.name ?? 'Rooms' }}</ion-title>
            <ion-buttons slot="end"><ion-button @click="roomsOf = null">Close</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <template v-if="roomsOf">
            <h2 class="dl-h2 sheet-title">Rooms &amp; availability</h2>
            <listing-rooms :rooms="roomsOf.rooms" :apply-href="`/listings/${roomsOf.id}/apply`" />
            <ion-button expand="block" class="dl-tonal ion-margin-top" @click="open(roomsOf.id)">View details</ion-button>
          </template>
        </ion-content>
      </ion-modal>

      <!-- Filters -->
      <ion-modal :is-open="filtersOpen" @did-dismiss="filtersOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Filters</ion-title>
            <ion-buttons slot="start"><ion-button @click="reset">Reset</ion-button></ion-buttons>
            <ion-buttons slot="end"><ion-button :strong="true" @click="applyFilters">Show results</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <div class="filters">
            <section>
              <h3 class="filter-label">Monthly price (₱)</h3>
              <div class="row">
                <ion-input v-model="filters.minPrice" inputmode="decimal" label="Min" label-placement="stacked" fill="outline" />
                <ion-input v-model="filters.maxPrice" inputmode="decimal" label="Max" label-placement="stacked" fill="outline" />
              </div>
            </section>
            <section>
              <h3 class="filter-label">Rental type</h3>
              <ion-segment v-model="filters.mode">
                <ion-segment-button value=""><ion-label>Any</ion-label></ion-segment-button>
                <ion-segment-button value="bedspaces"><ion-label>Bedspace</ion-label></ion-segment-button>
                <ion-segment-button value="whole"><ion-label>Whole room</ion-label></ion-segment-button>
              </ion-segment>
            </section>
            <section>
              <h3 class="filter-label">Included in the rent</h3>
              <div class="chips">
                <DlChip v-for="u in includeOptions" :key="u.value" :icon="u.icon" :selected="filters.includes.includes(u.value)" @click="toggleInclude(u.value)">
                  {{ u.label }}
                </DlChip>
              </div>
            </section>
            <section>
              <h3 class="filter-label">Who can stay</h3>
              <ion-segment v-model="filters.whoCanStay">
                <ion-segment-button value=""><ion-label>Anyone</ion-label></ion-segment-button>
                <ion-segment-button value="female"><ion-label>Female</ion-label></ion-segment-button>
                <ion-segment-button value="male"><ion-label>Male</ion-label></ion-segment-button>
              </ion-segment>
            </section>
            <section>
              <h3 class="filter-label">Availability</h3>
              <ion-list lines="none">
                <ion-item><ion-toggle v-model="filters.availableOnly">Only places with a free room</ion-toggle></ion-item>
              </ion-list>
            </section>
          </div>
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  type InfiniteScrollCustomEvent,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue'
import { BedDouble, Droplets, List, Map as MapIcon, MapPin, SlidersHorizontal, Wifi, Zap } from 'lucide-vue-next'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListingMap from '@/components/ListingMap.vue'
import ListingRooms from '@/components/rooms/ListingRooms.vue'
import { DlCard, DlChip, DlEmptyState, DlListingCard, DlSkeleton } from '@/components/dl'
import { useDistanceFrom } from '@/composables/useDistanceFrom'
import { formatDistance } from '@/lib/distance'
import { activeCount, emptyFilters, type FinderFilters, fromRouteQuery, toQuery } from '@/lib/listingFilters'
import { peso } from '@/lib/money'
import { errorMessage } from '@/services/api'
import { listingService } from '@/services/listings'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { ListingDetail, ListingSummary } from '@/types/booking'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const toast = useToast()

/** The map shows up to this many pins at once; "Search this area" narrows it. */
const MAP_LIMIT = 200

const distance = useDistanceFrom()
const filters = reactive<FinderFilters>({ ...emptyFilters(), sort: 'nearest', ...fromRouteQuery(route.query) })
const items = ref<ListingSummary[]>([])
const view = ref<'list' | 'map'>('map')
const selectedId = ref<number | null>(null)
const selected = computed(() => items.value.find((l) => l.id === selectedId.value) ?? null)
const picking = ref(false)
const origin = computed(() =>
  distance.point.value ? { lat: distance.point.value.lat, lng: distance.point.value.lng, label: distance.label.value } : null,
)
const filtersOpen = ref(false)
const loading = ref(false)
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const active = computed(() => activeCount(filters))

async function search(reset = true) {
  loading.value = true
  try {
    const next = reset ? 1 : page.value + 1
    const query = { ...toQuery(filters, next, distance.near.value), ...(view.value === 'map' ? { per_page: MAP_LIMIT } : {}) }
    const { items: found, meta } = await listingService.search(query)
    items.value = reset ? found : [...items.value, ...found]
    page.value = meta.current_page
    lastPage.value = meta.last_page
    total.value = meta.total
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await distance.ready
  if (filters.sort === 'nearest' && !distance.near.value) filters.sort = 'newest'
  search()
})

/** After choosing where to measure from, list the nearest places first. */
function measured() {
  if (filters.sort === 'newest') filters.sort = 'nearest'
  search()
}

function select(id: number | null) {
  selectedId.value = id
}

const roomsOf = ref<ListingDetail | null>(null)

async function viewRooms(id: number) {
  try {
    roomsOf.value = (await listingService.get(id)).listing
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

async function chooseFrom() {
  const buttons = [
    ...distance.campuses.value.map((c) => ({ text: c.name, handler: () => void distance.chooseCampus(c).then(measured) })),
    {
      text: 'My location',
      handler: () =>
        void distance
          .chooseMyLocation()
          .then((ok) => (ok ? measured() : toast.error('Could not get your location. Choose a campus or a point instead.'))),
    },
    {
      text: 'Choose a point on the map',
      handler: () => {
        view.value = 'map'
        picking.value = true
      },
    },
    { text: 'Cancel', role: 'cancel' },
  ]
  const sheet = await actionSheetController.create({ header: 'Measure distance from', buttons })
  await sheet.present()
}

async function pickPoint(lat: number, lng: number) {
  picking.value = false
  await distance.choosePoint(lat, lng)
  measured()
}

async function more(event: InfiniteScrollCustomEvent) {
  await search(false)
  event.target.complete()
}

function open(id: number) {
  roomsOf.value = null
  router.push(`/listings/${id}`)
}

const includeOptions = [
  { value: 'water', label: 'Water', icon: Droplets },
  { value: 'electricity', label: 'Electricity', icon: Zap },
  { value: 'internet', label: 'Internet', icon: Wifi },
]

/** "Dormitory · Barangay, City" */
function placeLine(l: ListingSummary): string {
  return [l.type_label, [l.barangay, l.city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')
}

function priceOf(l: ListingSummary): string | null {
  return l.price_from_centavos !== null ? `from ${peso(l.price_from_centavos).replace('.00', '')}` : null
}

function distanceLine(l: ListingSummary): string | null {
  return l.distance_m !== null ? `${formatDistance(l.distance_m)} from ${distance.label.value}` : null
}

/** The empty list's action: drop every filter and the map area, keep the search words. */
function clearFilters() {
  reset()
  filters.bbox = null
  search()
}

function toggleInclude(u: string) {
  filters.includes = filters.includes.includes(u) ? filters.includes.filter((x) => x !== u) : [...filters.includes, u]
}

function applyFilters() {
  filtersOpen.value = false
  search()
}

function reset() {
  Object.assign(filters, { ...emptyFilters(), q: filters.q, sort: filters.sort })
}

function searchArea(bbox: [number, number, number, number]) {
  filters.bbox = bbox
  search()
}

function clearArea() {
  filters.bbox = null
  search()
}
</script>

<style scoped>
.wide {
  max-width: 720px;
}
.bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 var(--screen-pad);
}
.view-toggle {
  width: 104px;
  margin: 0;
}
.from {
  padding-top: 8px;
  padding-bottom: 8px;
}
.sort {
  margin-left: auto;
  font-size: 14px;
  font-weight: 700;
}
.count {
  margin: 0 0 12px;
}
.count a {
  font-weight: 700;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin: 10px 0;
}
.key {
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: -6px;
  border-radius: 50%;
}
.key.free { background: var(--brand-primary); }
.key.full { background: var(--stone-400); }
.key.origin { background: var(--info-solid); }
.pin-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 4px 0 16px;
}
.pin-card :deep(.dl-listing-card) {
  padding: 0;
  background: none;
}
.card-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.card-actions ion-button { margin: 0; }
.cards {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}
.skeleton-card {
  display: flex;
  gap: 12px;
}
.skeleton-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}
.sheet-title {
  margin-bottom: 12px;
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 22px;
}
.filters section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.filter-label {
  margin: 0;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 700;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
</style>
