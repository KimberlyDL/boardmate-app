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
            <ion-segment-button value="map" aria-label="Map"><ion-icon :icon="mapOutline" /></ion-segment-button>
            <ion-segment-button value="list" aria-label="List"><ion-icon :icon="listOutline" /></ion-segment-button>
          </ion-segment>
          <ion-button size="small" fill="outline" @click="filtersOpen = true">
            <ion-icon slot="start" :icon="optionsOutline" /> Filters{{ active ? ` (${active})` : '' }}
          </ion-button>
          <ion-select v-model="filters.sort" interface="popover" aria-label="Sort" class="sort" @ion-change="search()">
            <ion-select-option v-if="distance.near.value" value="nearest">Nearest</ion-select-option>
            <ion-select-option value="newest">Newest</ion-select-option>
            <ion-select-option value="price">Lowest price</ion-select-option>
          </ion-select>
        </div>
        <div class="bar from">
          <ion-chip outline @click="chooseFrom">
            <ion-icon :icon="locationOutline" />
            <ion-label>Distance from: {{ distance.label.value }}</ion-label>
            <ion-icon :icon="chevronDown" />
          </ion-chip>
          <ion-button v-if="picking" size="small" fill="clear" @click="picking = false">Cancel</ion-button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="narrow wide ion-padding">
        <p class="muted">{{ total }} {{ total === 1 ? 'place' : 'places' }} found<span v-if="filters.bbox"> in this map area · <a href="#" @click.prevent="clearArea">clear area</a></span></p>

        <template v-if="view === 'map'">
          <listing-map
            :listings="items"
            :selected-id="selected?.id ?? null"
            :origin="origin"
            :picking="picking"
            searchable
            height="62vh"
            @select="select"
            @search-area="searchArea"
            @pick="pickPoint"
          />
          <p class="muted legend">
            <span class="dot free" /> Has free rooms <span class="dot full" /> Full right now
            <span class="dot origin" /> {{ distance.label.value }}
          </p>

          <ion-card v-if="selected" class="pin-card">
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
        </template>

        <template v-else>
          <p v-if="!loading && !items.length" class="muted center">No places match. Try fewer filters or another area.</p>
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
            <h3>Rooms &amp; availability</h3>
            <listing-rooms :rooms="roomsOf.rooms" :apply-href="`/listings/${roomsOf.id}/apply`" />
            <ion-button expand="block" fill="outline" class="ion-margin-top" @click="open(roomsOf.id)">View details</ion-button>
          </template>
        </ion-content>
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
import { chevronDown, listOutline, locationOutline, mapOutline, optionsOutline, walkOutline } from 'ionicons/icons'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ListingMap from '@/components/ListingMap.vue'
import ListingRooms from '@/components/rooms/ListingRooms.vue'
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
  padding: 0 8px;
}
.view-toggle {
  width: 110px;
}
.from {
  padding-bottom: 4px;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
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
.pin-card {
  margin: 8px 0 16px;
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
.card {
  margin: 0 0 16px;
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
