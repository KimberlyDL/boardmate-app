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
          <ion-segment v-model="view" class="view-toggle">
            <ion-segment-button value="list"><ion-icon :icon="listOutline" /></ion-segment-button>
            <ion-segment-button value="map"><ion-icon :icon="mapOutline" /></ion-segment-button>
          </ion-segment>
          <ion-button size="small" fill="outline" @click="filtersOpen = true">
            <ion-icon slot="start" :icon="optionsOutline" /> Filters{{ active ? ` (${active})` : '' }}
          </ion-button>
          <ion-select v-model="filters.sort" interface="popover" aria-label="Sort" class="sort" @ion-change="search()">
            <ion-select-option value="newest">Newest</ion-select-option>
            <ion-select-option value="price">Lowest price</ion-select-option>
          </ion-select>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="narrow wide ion-padding">
        <p class="muted">{{ total }} {{ total === 1 ? 'place' : 'places' }} found<span v-if="filters.bbox"> in this map area · <a href="#" @click.prevent="clearArea">clear area</a></span></p>

        <listing-map
          v-if="view === 'map'"
          :listings="items"
          searchable
          height="65vh"
          @select="open"
          @search-area="searchArea"
        />

        <template v-else>
          <p v-if="!loading && !items.length" class="muted center">No places match. Try fewer filters or another area.</p>
          <ion-card v-for="l in items" :key="l.id" button class="card" @click="open(l.id)">
            <img v-if="l.cover_photo_url" :src="l.cover_photo_url" alt="" class="cover" />
            <ion-card-header>
              <ion-card-subtitle>{{ l.type_label }} · {{ [l.barangay, l.city].filter(Boolean).join(', ') }}</ion-card-subtitle>
              <ion-card-title>{{ l.name }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="price">
                <strong>{{ l.price_from_centavos !== null ? `from ${peso(l.price_from_centavos)}` : 'Price on request' }}</strong> / month
              </p>
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
            <ion-segment-button value="whole"><ion-label>Whole place</ion-label></ion-segment-button>
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
          <h3>Who can apply</h3>
          <ion-input v-model="filters.who" fill="outline" placeholder="e.g. female, students" aria-label="Who can apply" />
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type InfiniteScrollCustomEvent,
  IonBackButton,
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
  IonLabel,
  IonModal,
  IonPage,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { listOutline, mapOutline, optionsOutline } from 'ionicons/icons'
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import ListingMap from '@/components/ListingMap.vue'
import { activeCount, emptyFilters, toQuery } from '@/lib/listingFilters'
import { peso } from '@/lib/money'
import { errorMessage } from '@/services/api'
import { listingService } from '@/services/listings'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { ListingSummary } from '@/types/booking'

const auth = useAuthStore()
const router = useRouter()
const toast = useToast()

const filters = reactive(emptyFilters())
const items = ref<ListingSummary[]>([])
const view = ref<'list' | 'map'>('list')
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
    const { items: found, meta } = await listingService.search(toQuery(filters, next))
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

onMounted(() => search())

async function more(event: InfiniteScrollCustomEvent) {
  await search(false)
  event.target.complete()
}

function open(id: number) {
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
