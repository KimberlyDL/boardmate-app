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
              <ion-segment-button value="map" aria-label="Map"><ion-icon :icon="mapOutline" /></ion-segment-button>
              <ion-segment-button value="list" aria-label="List"><ion-icon :icon="listOutline" /></ion-segment-button>
            </ion-segment>
            <ion-button size="small" :fill="active ? 'solid' : 'outline'" class="filters-btn" @click="filtersOpen = true">
              <ion-icon slot="start" :icon="optionsOutline" />
              Filters
              <span v-if="active" class="count" :aria-label="`${active} on`">{{ active }}</span>
            </ion-button>
            <ion-chip outline class="from-chip" @click="chooseFrom">
              <ion-icon :icon="locationOutline" />
              <ion-label><span class="from-word">From</span> {{ distance.label.value }}</ion-label>
              <ion-icon :icon="chevronDown" />
            </ion-chip>
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
            <strong>{{ total }} {{ total === 1 ? 'place' : 'places' }}</strong>
            {{ radiusActive ? `within ${radiusKm} km of ${distance.label.value}` : 'found' }}<span v-if="filters.bbox"> in this map area · <a href="#" @click.prevent="clearArea">clear area</a></span>
          </p>
          <p v-if="view === 'map'" class="muted legend">
            <span class="dot free" /> Has free rooms <span class="dot full" /> Full right now
            <template v-if="distance.near.value"><span class="dot origin" /> {{ distance.label.value }}</template>
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
                <ion-icon :icon="panelOpen ? chevronForward : chevronBack" />
              </button>
              <ion-card class="pin-card">
                <ion-card-header>
                  <ion-card-subtitle>{{ selected.type_label }} · {{ [selected.barangay, selected.city].filter(Boolean).join(', ') }}</ion-card-subtitle>
                  <ion-card-title>{{ selected.name }}</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <p v-if="selected.distance_m !== null">
                    <ion-icon :icon="walkOutline" /> {{ formatDistance(selected.distance_m) }} from {{ distance.label.value }} (straight line)
                  </p>
                  <p class="price">
                    <ion-badge v-if="selected.is_full" color="medium">Full right now</ion-badge>
                    <template v-else>
                      <strong>{{ selected.price_from_centavos !== null ? `from ${peso(selected.price_from_centavos)}` : 'Price on request' }}</strong> / month
                    </template>
                  </p>
                  <p>{{ selected.availability.label }}</p>
                  <div class="card-actions">
                    <ion-button expand="block" @click="viewRooms(selected.id)">View rooms</ion-button>
                    <ion-button expand="block" fill="outline" @click="open(selected.id)">View details</ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
            </aside>
          </div>
        </template>

        <template v-else>
          <p v-if="!loading && !items.length" class="muted center">No places match. Try fewer filters or another area.</p>
          <div class="card-grid">
          <ion-card v-for="l in items" :key="l.id" button class="card" :class="{ full: l.is_full }" @click="open(l.id)">
            <img v-if="l.cover_photo_url" :src="l.cover_photo_url" alt="" class="cover" loading="lazy" />
            <ion-card-header>
              <ion-card-subtitle>{{ l.type_label }} · {{ [l.barangay, l.city].filter(Boolean).join(', ') }}</ion-card-subtitle>
              <ion-card-title>{{ l.name }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="price">
                <ion-badge v-if="l.is_full" color="medium">Full right now</ion-badge>
                <template v-else>
                  <strong>{{ l.price_from_centavos !== null ? `from ${peso(l.price_from_centavos)}` : 'Price on request' }}</strong> / month
                </template>
              </p>
              <p v-if="l.distance_m !== null">{{ formatDistance(l.distance_m) }} from {{ distance.label.value }}</p>
              <p>{{ l.availability.label }}</p>
              <p>
                <ion-chip v-for="u in l.included_utilities" :key="u" class="chip" color="success">{{ u }} included</ion-chip>
                <ion-chip v-if="l.who_can_apply" class="chip">{{ l.who_can_apply }}</ion-chip>
              </p>
            </ion-card-content>
          </ion-card>
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
            <h3>Rooms &amp; availability</h3>
            <listing-rooms :rooms="roomsOf.rooms" :apply-href="`/listings/${roomsOf.id}/apply`" :initial-filters="roomFilters" />
          </template>
        </ion-content>
        <!-- Button that always stays at the bottom -->
        <ion-footer v-if="roomsOf" class="rooms-footer">
          <ion-toolbar>
            <ion-button expand="block" fill="outline" @click="open(roomsOf.id)">View place details</ion-button>
          </ion-toolbar>
        </ion-footer>
      </ion-modal>

      <!-- Filters -->
      <ion-modal :is-open="filtersOpen" @did-dismiss="filtersOpen = false">
        <ion-header>
          <ion-toolbar>
            <ion-title>Filters</ion-title>
            <ion-buttons slot="start"><ion-button @click="reset">Clear</ion-button></ion-buttons>
            <ion-buttons slot="end"><ion-button :strong="true" @click="applyFilters">Show results</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content class="ion-padding">
          <h3>Monthly price (₱)</h3>
          <div class="row">
            <ion-input v-model="filters.minPrice" inputmode="decimal" label="Min" label-placement="stacked" fill="outline" />
            <ion-input v-model="filters.maxPrice" inputmode="decimal" label="Max" label-placement="stacked" fill="outline" />
          </div>
          <h3>Rental type</h3>
          <ion-segment v-model="filters.mode">
            <ion-segment-button value=""><ion-label>Any</ion-label></ion-segment-button>
            <ion-segment-button value="bedspaces"><ion-label>Bedspace</ion-label></ion-segment-button>
            <ion-segment-button value="whole"><ion-label>Whole room</ion-label></ion-segment-button>
          </ion-segment>
          <h3>Included in the rent</h3>
          <ion-chip
            v-for="u in ['water', 'electricity', 'internet']"
            :key="u"
            :outline="!filters.includes.includes(u)"
            :color="filters.includes.includes(u) ? 'primary' : undefined"
            @click="toggleInclude(u)"
          >
            {{ u }}
          </ion-chip>
          <h3>Who can stay</h3>
          <ion-segment v-model="filters.whoCanStay">
            <ion-segment-button value=""><ion-label>Anyone</ion-label></ion-segment-button>
            <ion-segment-button value="female"><ion-label>Female</ion-label></ion-segment-button>
            <ion-segment-button value="male"><ion-label>Male</ion-label></ion-segment-button>
          </ion-segment>
          <h3>Availability</h3>
          <ion-item lines="none" class="toggle">
            <ion-toggle v-model="filters.availableOnly">Only places with a free room</ion-toggle>
          </ion-item>
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
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonChip,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonInput,
  IonItem,
  IonLabel,
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
import { chevronBack, chevronDown, chevronForward, listOutline, locationOutline, mapOutline, optionsOutline, walkOutline } from 'ionicons/icons'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListingMap from '@/components/ListingMap.vue'
import ListingRooms from '@/components/rooms/ListingRooms.vue'
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
  --color: var(--ion-color-medium);
  --color-checked: var(--ion-color-primary-contrast);
  --background-checked: var(--ion-color-primary);
  --background-hover: transparent;
  --ripple-color: transparent;
}
.view-toggle ion-segment-button.segment-button-checked {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}
.view-toggle ion-icon {
  font-size: 18px;
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
  background: var(--ion-color-secondary);
  color: var(--ion-color-secondary-contrast);
  font-size: 0.75rem;
  font-weight: 800;
}
.from-chip {
  max-width: min(420px, 100%);
  margin: 0;
  height: 34px;
}
.from-chip ion-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.from-word {
  color: var(--ion-color-medium);
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
  margin: 0;
  font-size: 0.95rem;
  color: var(--ion-color-medium);
}
.results strong {
  color: var(--ion-text-color);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin: 0;
  font-size: 0.8rem;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: -6px;
}
.dot.free {
  background: var(--ion-color-success);
}
.dot.full {
  background: var(--ion-color-medium);
}
.dot.origin {
  background: #3880ff;
}
/* The map and the panel over its right side. */
/* ---------- Map ---------- */
.map-wrap {
  --map-h: clamp(320px, calc(100vh - 390px), 860px);
  position: relative;
  overflow: hidden;
  border: 1px solid var(--bm-border);
  border-radius: 16px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
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
  border-radius: 8px 0 0 8px;
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-size: 1.2rem;
  cursor: pointer;
  box-shadow: -2px 2px 6px rgba(0, 0, 0, 0.25);
}
.panel-tab:focus-visible {
  outline: 3px solid var(--ion-color-primary-contrast);
  outline-offset: -4px;
}
.pin-card {
  margin: 0;
  max-height: calc(var(--map-h) - 72px);
  overflow-y: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
}
.pin-card .card-actions {
  grid-template-columns: 1fr;
}
.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
}
.card.full {
  opacity: 0.7;
}
.toggle {
  --padding-start: 0;
}
.sort {
  margin-left: auto;
}
/* ---------- List ---------- */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 16px;
}
.card {
  margin: 0;
  border: 1px solid var(--bm-border);
  border-radius: 16px;
  box-shadow: none;
}
.cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}
.price {
  color: var(--ion-text-color);
  font-size: 1.05rem;
}
.chip {
  height: 22px;
  font-size: 0.75rem;
  margin: 4px 4px 0 0;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
h3 {
  font-size: 0.95rem;
  margin: 18px 0 8px;
}
</style>
