<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="auth.isLoggedIn ? auth.homePath : '/'" /></ion-buttons>
        <ion-title>Find a place</ion-title>
      </ion-toolbar>
      <!-- Search box and buttons -->
      <ion-toolbar class="finder-bar">
        <div class="shell controls">
          <ion-searchbar
            v-model="filters.q"
            class="search"
            :debounce="500"
            placeholder="City, barangay or name"
            @ion-input="search()"
          />
          <div class="control-row">
            <ion-segment v-model="view" class="view-toggle" @ion-change="search()">
              <ion-segment-button value="map" aria-label="Map"><MapIcon :size="18" aria-hidden="true" /></ion-segment-button>
              <ion-segment-button value="list" aria-label="List"><List :size="18" aria-hidden="true" /></ion-segment-button>
            </ion-segment>
            <ion-button size="small" :class="{ 'dl-tonal': !active }" class="filters-btn" @click="filtersOpen = true">
              <SlidersHorizontal slot="start" :size="16" aria-hidden="true" />
              Filters
              <span v-if="active" class="count" :aria-label="`${active} on`">{{ active }}</span>
            </ion-button>
            <DlChip :icon="MapPin" class="from-chip" @click="chooseFrom">
              <span class="from-label"><span class="from-word">From</span> {{ distance.label.value }}</span>
              <ChevronDown :size="14" aria-hidden="true" />
            </DlChip>
            <ion-select
              v-if="distance.near.value"
              v-model="radiusKm"
              interface="popover"
              aria-label="How far from it"
              class="pill-select within"
              :disabled="searching"
              @ion-change="search()"
            >
              <ion-select-option v-for="km in RADIUS_CHOICES_KM" :key="km" :value="km">Within {{ km }} km</ion-select-option>
              <ion-select-option :value="0">Any distance</ion-select-option>
            </ion-select>
            <ion-button v-if="picking" size="small" fill="clear" @click="picking = false">Cancel</ion-button>
            <ion-select v-model="filters.sort" interface="popover" aria-label="Sort" class="pill-select sort" @ion-change="search()">
              <ion-select-option v-if="distance.near.value" value="nearest">Nearest first</ion-select-option>
              <ion-select-option value="newest">Newest first</ion-select-option>
              <ion-select-option value="price">Lowest price first</ion-select-option>
            </ion-select>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="shell body">
        <div class="results-row">
          <p class="results">
            <span class="dl-title">{{ total }} {{ total === 1 ? 'place' : 'places' }}</span>
            <span class="dl-small">{{ radiusActive ? `within ${radiusKm} km of ${distance.label.value}` : 'found' }}<span v-if="filters.bbox"> in this map area · <a href="#" @click.prevent="clearArea">clear area</a></span></span>
          </p>
          <p v-if="view === 'map'" class="legend dl-small">
            <span class="key free" /> Has free rooms <span class="key full" /> Full right now
            <template v-if="distance.near.value"><span class="key origin" /> {{ distance.label.value }}</template>
          </p>
        </div>

        <template v-if="view === 'map'">
          <div class="map-wrap">
            <listing-map
              :listings="items"
              :selected-id="selected?.id ?? null"
              :origin="origin"
              :radius-m="radiusActive ? radiusKm * 1000 : null"
              :picking="picking"
              searchable
              height="var(--map-h)"
              @select="select"
              @search-area="searchArea"
              @pick="pickPoint"
            />

            <!-- Card for the tapped place -->
            <aside v-if="selected" class="pin-panel" :class="{ collapsed: !panelOpen }" aria-label="Selected place">
              <button
                type="button"
                class="panel-tab"
                :aria-label="panelOpen ? 'Hide the place details' : 'Show the place details'"
                :aria-expanded="panelOpen"
                @click="panelOpen = !panelOpen"
              >
                <component :is="panelOpen ? ChevronRight : ChevronLeft" :size="20" aria-hidden="true" />
              </button>
              <DlCard class="pin-card" :padding="12">
                <DlListingCard
                  :title="selected.name"
                  :eyebrow="placeLine(selected)"
                  :price="priceOf(selected)"
                  :full="selected.is_full"
                  :image-src="selected.cover_photo_url"
                  :meta="[distanceLine(selected, true), selected.availability.label]"
                />
                <div class="card-actions">
                  <ion-button expand="block" @click="viewRooms(selected.id)"><BedDouble slot="start" :size="18" aria-hidden="true" /> View rooms</ion-button>
                  <ion-button expand="block" class="dl-tonal" @click="open(selected.id)">View details</ion-button>
                </div>
              </DlCard>
            </aside>
          </div>
        </template>

        <template v-else>
          <div v-if="loading && !items.length" class="card-grid">
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
          <div v-else class="card-grid">
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
      <ion-modal :is-open="!!roomsOf" class="rooms-modal" @did-dismiss="roomsOf = null">
        <ion-header>
          <ion-toolbar>
            <ion-title>{{ roomsOf?.name ?? 'Rooms' }}</ion-title>
            <ion-buttons slot="end"><ion-button @click="roomsOf = null">Close</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <template v-if="roomsOf">
            <h2 class="dl-h2 sheet-title">Rooms &amp; availability</h2>
            <listing-rooms :rooms="roomsOf.rooms" :apply-href="`/listings/${roomsOf.id}/apply`" :initial-filters="roomFilters" />
          </template>
        </ion-content>
        <!-- Button that always stays at the bottom -->
        <ion-footer v-if="roomsOf" class="rooms-footer">
          <ion-toolbar>
            <ion-button expand="block" class="dl-tonal" @click="open(roomsOf.id)">View place details</ion-button>
          </ion-toolbar>
        </ion-footer>
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
  IonFooter,
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
import {
  BedDouble,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Droplets,
  List,
  Map as MapIcon,
  MapPin,
  SlidersHorizontal,
  Wifi,
  Zap,
} from 'lucide-vue-next'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListingMap from '@/components/ListingMap.vue'
import ListingRooms from '@/components/rooms/ListingRooms.vue'
import { DlCard, DlChip, DlEmptyState, DlListingCard, DlSkeleton } from '@/components/dl'
import { useDistanceFrom } from '@/composables/useDistanceFrom'
import { boxAround, DEFAULT_RADIUS_KM, formatDistance, RADIUS_CHOICES_KM, withinRadius } from '@/lib/distance'
import { activeCount, emptyFilters, type FinderFilters, fromRouteQuery, toQuery } from '@/lib/listingFilters'
import type { RoomFilters } from '@/lib/floors'
import { peso, toCentavos } from '@/lib/money'
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
/** Whether the place card is open */
const panelOpen = ref(true)
// Open the card when a new pin is tapped
watch(selectedId, (id) => {
  if (id !== null) panelOpen.value = true
})
const picking = ref(false)
const origin = computed(() =>
  distance.point.value ? { lat: distance.point.value.lat, lng: distance.point.value.lng, label: distance.label.value } : null,
)
const filtersOpen = ref(false)

/** The Find filters, passed on to "View rooms" */
const roomFilters = computed<Partial<RoomFilters>>(() => ({
  kind: filters.mode === 'bedspaces' ? 'bedspace' : filters.mode === 'whole' ? 'whole' : 'any',
  who: filters.whoCanStay || 'any',
  availableOnly: true,
  minRent: toCentavos(filters.minPrice),
  maxRent: toCentavos(filters.maxPrice),
}))
const loading = ref(false)
const page = ref(1)
const lastPage = ref(1)
const total = ref(0)
const active = computed(() => activeCount(filters))
/** How far to search, in km (0 means any distance) */
const radiusKm = ref<number>(DEFAULT_RADIUS_KM)
/** Searching by name ignores the distance */
const searching = computed(() => !!filters.q.trim())
/** True when the distance limit is used */
const radiusActive = computed(() => radiusKm.value > 0 && !!distance.near.value && !searching.value && !filters.bbox)

async function search(reset = true) {
  loading.value = true
  try {
    const next = reset ? 1 : page.value + 1
    const near = distance.near.value
    const query: Record<string, string | number | string[]> = { ...toQuery(filters, next, near), ...(view.value === 'map' || radiusActive.value ? { per_page: MAP_LIMIT } : {}) }
    if (radiusActive.value && near) {
      // Search a square area, then keep only the places inside the circle
      query.bbox = boxAround(near.lat, near.lng, radiusKm.value * 1000).map((n) => n.toFixed(5)).join(',')
    }
    const { items: found, meta } = await listingService.search(query)
    if (radiusActive.value) {
      items.value = withinRadius(found, radiusKm.value * 1000)
      page.value = 1
      lastPage.value = 1
      total.value = items.value.length
      return
    }
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

/** With no distance, show the newest first */
function cleared() {
  if (filters.sort === 'nearest') filters.sort = 'newest'
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
    { text: 'Anywhere in Calapan (no distance)', handler: () => void distance.clear().then(cleared) },
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

/** "350 m from <place>"; the map card adds "(straight line)" */
function distanceLine(l: ListingSummary, straight = false): string | null {
  if (l.distance_m === null) return null
  return `${formatDistance(l.distance_m)} from ${distance.label.value}${straight ? ' (straight line)' : ''}`
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
/* Bigger rooms sheet on tablets and computers */
@media (min-width: 768px) {
  :global(ion-modal.rooms-modal) {
    --width: min(1100px, 92vw);
    --height: min(920px, 92vh);
    --border-radius: 16px;
  }
}
.rooms-footer ion-toolbar {
  --padding-start: 16px;
  --padding-end: 16px;
  --padding-top: 8px;
  --padding-bottom: 8px;
}
/* ---------- Layout ---------- */
.shell {
  max-width: 1240px;
  margin: 0 auto;
  padding: 0 16px;
}
.finder-bar {
  --padding-top: 4px;
  --padding-bottom: 10px;
  border-bottom: 1px solid var(--bm-border);
}
.controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}
.search {
  padding: 0;
  --border-radius: 12px;
  --box-shadow: none;
  --background: var(--bm-surface-alt);
}
.control-row {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
@media (min-width: 900px) {
  /* Search box and buttons on one row */
  .controls {
    grid-template-columns: minmax(260px, 1fr) minmax(0, auto);
    align-items: center;
  }
}
/* ---------- Controls ---------- */
/* Map and List switch */
.view-toggle {
  flex: 0 0 104px;
  width: 104px;
  min-height: 0;
  padding: 3px;
  gap: 2px;
  border: 1px solid var(--bm-border);
  border-radius: 999px;
  --background: var(--bm-surface-alt);
}
.view-toggle ion-segment-button {
  flex: 1 1 0;
  min-width: 0;
  min-height: 30px;
  height: 30px;
  margin: 0;
  border-radius: 999px;
  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 12px;
  --padding-end: 12px;
  --border-radius: 999px;
  --indicator-height: 0;
  --indicator-color: transparent;
  --color: var(--text-muted);
  --color-checked: var(--text-on-ink);
  --background-checked: var(--bg-ink);
  --background-hover: transparent;
  --ripple-color: transparent;
}
.view-toggle ion-segment-button.segment-button-checked {
  background: var(--bg-ink);
  color: var(--text-on-ink);
}
.filters-btn {
  margin: 0;
  white-space: nowrap;
}
.filters-btn .count {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--brand-accent);
  color: var(--text-on-accent);
  font-size: 12px;
  font-weight: 800;
}
.from-chip {
  max-width: min(420px, 100%);
  height: 34px;
}
.from-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.from-word {
  opacity: 0.7;
  margin-right: 2px;
}
/* Distance and sort menus */
.pill-select {
  flex: 0 0 auto;
  width: auto;
  max-width: 220px;
  min-height: 34px;
  padding: 0 12px;
  border: 1px solid var(--bm-border);
  border-radius: 999px;
  background: var(--bm-surface-alt);
  font-size: 0.85rem;
  font-weight: 600;
}
.body {
  padding-top: 12px;
  padding-bottom: 24px;
}
.results-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
  margin-bottom: 10px;
}
.results {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 6px;
  margin: 0;
}
.results a {
  font-weight: 700;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin: 0;
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
/* The map and the panel over its right side. */
/* ---------- Map ---------- */
.map-wrap {
  --map-h: clamp(320px, calc(100vh - 390px), 860px);
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
}
@media (min-width: 900px) {
  .map-wrap {
    --map-h: clamp(420px, calc(100vh - 230px), 860px);
  }
}
.pin-panel {
  position: absolute;
  top: 56px;
  right: 10px;
  z-index: 1000; /* above the map's own layers and controls */
  width: min(320px, calc(100% - 64px));
  transition: transform 0.25s ease;
}
.pin-panel.collapsed {
  transform: translateX(calc(100% + 10px));
}
.panel-tab {
  position: absolute;
  top: 18px;
  left: -32px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 48px;
  border: none;
  border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  background: var(--bg-ink);
  color: var(--text-on-ink);
  cursor: pointer;
}
.panel-tab:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
/* Over the map the card needs a lift to read as a layer; the design system's cards are flat elsewhere. */
.pin-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(var(--map-h) - 72px);
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
}
.pin-card :deep(.dl-listing-card) {
  padding: 0;
  background: none;
}
.card-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.card-actions ion-button { margin: 0; }
.sort {
  margin-left: auto;
}
.sheet-title {
  margin-bottom: 12px;
}
/* ---------- List ---------- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
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
/* ---------- Filters ---------- */
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
