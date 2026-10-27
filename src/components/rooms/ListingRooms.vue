<template>
  <div ref="root">
    <div v-if="rooms.length" class="filters">
      <ion-segment v-model="filters.kind" class="kind">
        <ion-segment-button value="any"><ion-label>All</ion-label></ion-segment-button>
        <ion-segment-button value="bedspace"><ion-label>Bedspace</ion-label></ion-segment-button>
        <ion-segment-button value="whole"><ion-label>Whole room</ion-label></ion-segment-button>
      </ion-segment>
      <div class="filter-row">
        <ion-select v-model="filters.who" interface="popover" label="Who can stay" label-placement="stacked" class="who">
          <ion-select-option value="any">Anyone</ion-select-option>
          <ion-select-option value="female">Female</ion-select-option>
          <ion-select-option value="male">Male</ion-select-option>
        </ion-select>
        <ion-toggle v-model="filters.availableOnly" label-placement="end" class="free-only">Free only</ion-toggle>
      </div>
      <!-- Price range picked on the Find page -->
      <div v-if="priceText" class="price-filter">
        <span class="muted small">Your price range:</span>
        <ion-chip class="price-chip" @click="clearPrice">
          <ion-label>{{ priceText }}</ion-label>
          <ion-icon :icon="closeCircle" aria-label="Clear the price range" />
        </ion-chip>
      </div>
    </div>

    <template v-if="!floor">
      <div v-if="rooms.length" class="hint-row">
        <p class="muted small hint">Pick a floor to see its rooms.</p>
        <ion-button v-if="can3d" fill="clear" size="small" class="view-switch" @click="use3d = !use3d">{{ use3d ? 'Simple view' : '3D view' }}</ion-button>
      </div>
      <Building3D v-if="use3d" :floors="floors" @select="floorKey = $event" />
      <building-floors v-else :floors="floors" @select="floorKey = $event" />
    </template>
    <template v-else>
      <div v-if="!singleFloor" class="floor-head">
        <ion-button fill="clear" size="small" @click="floorKey = null">
          <ion-icon slot="start" :icon="chevronBack" /> All floors
        </ion-button>
        <div class="floor-tabs" role="group" aria-label="Floors">
          <button
            v-for="f in floors"
            :key="f.key"
            type="button"
            class="floor-tab"
            :class="{ on: f.key === floor.key, free: f.freeRooms > 0 }"
            :aria-pressed="f.key === floor.key"
            @click="floorKey = f.key"
          >
            {{ floorTabText(f) }}
          </button>
        </div>
      </div>
      <p v-if="!floor.rooms.length" class="muted">Nothing on this floor matches. Change the filters or pick another floor.</p>
      <div v-else class="hint-row">
        <p class="muted small hint">{{ floor.label }}, seen from above. Tap a room.</p>
        <ion-button v-if="can3d" fill="clear" size="small" class="view-switch" @click="use3d = !use3d">{{ use3d ? 'Simple view' : '3D view' }}</ion-button>
      </div>
      <!-- Floor plan, with room details beside it on big screens -->
      <div class="floor-body" :class="{ wide }">
        <div class="plan-col">
          <Floor3D
            v-if="use3d"
            :rooms="floor.allRooms"
            :match-ids="floor.rooms.map((r) => r.id)"
            :label="floor.label"
            :selected-id="preview?.id ?? null"
            @select="selectedId = $event"
          />
          <floor-plan
            v-else
            :rooms="floor.allRooms"
            :match-ids="floor.rooms.map((r) => r.id)"
            :label="floor.label"
            :selected-id="preview?.id ?? null"
            @select="selectedId = $event"
          />
        </div>
        <aside v-if="wide" class="detail-col" aria-label="Room details">
          <room-details v-if="preview" :room="preview" :apply-href="applyHref" :show3d="use3d" />
          <p v-else class="pick muted">Tap a room on the plan to see its details here.</p>
        </aside>
      </div>
    </template>

    <!-- Room details in a bottom sheet on phones -->
    <ion-modal
      v-if="!wide"
      :is-open="!!preview"
      :initial-breakpoint="0.55"
      :breakpoints="[0, 0.55, 0.95]"
      :backdrop-breakpoint="0.6"
      class="room-sheet"
      @did-dismiss="selectedId = null"
    >
      <ion-content v-if="preview" class="ion-padding">
        <room-details :room="preview" :apply-href="applyHref" :show3d="use3d" closable @close="selectedId = null" />
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonChip, IonContent, IonIcon, IonLabel, IonModal, IonSegment, IonSegmentButton, IonSelect, IonSelectOption, IonToggle } from '@ionic/vue'
import { chevronBack, closeCircle } from 'ionicons/icons'
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import BuildingFloors from '@/components/rooms/BuildingFloors.vue'
import FloorPlan from '@/components/rooms/FloorPlan.vue'
import RoomDetails from '@/components/rooms/RoomDetails.vue'
import { defaultRoomFilters, floorSummaries, floorTabText, type RoomFilters } from '@/lib/floors'
import { peso } from '@/lib/money'
import { supports3d } from '@/lib/room3d/model'
import type { PublicRoom } from '@/types/booking'

/** Rooms & availability: pick a floor, then a room, to see its details. */
const props = defineProps<{ rooms: PublicRoom[]; applyHref?: string | null; initialFilters?: Partial<RoomFilters> }>()

// 3D views load only when needed; phones without 3D get the flat views
const Building3D = defineAsyncComponent(() => import('@/components/rooms/Building3D.vue'))
const Floor3D = defineAsyncComponent(() => import('@/components/rooms/Floor3D.vue'))
const can3d = supports3d()
const use3d = ref(can3d)

// Use two columns when there is enough space
const WIDE_PX = 820
const root = ref<HTMLElement | null>(null)
const wide = ref(true)
let observer: ResizeObserver | null = null
onMounted(() => {
  // In unit tests there is no ResizeObserver, so keep two columns
  if (!root.value || typeof ResizeObserver === 'undefined') return
  wide.value = root.value.clientWidth >= WIDE_PX
  observer = new ResizeObserver(() => {
    if (root.value) wide.value = root.value.clientWidth >= WIDE_PX
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => observer?.disconnect())

const filters = reactive<RoomFilters>({ ...defaultRoomFilters(), ...props.initialFilters })

const wholePeso = (c: number) => peso(c).replace('.00', '')
/** Text for the price range chip */
const priceText = computed(() => {
  const { minRent: min, maxRent: max } = filters
  if (min !== null && max !== null) return `${wholePeso(min)}–${wholePeso(max)}`
  if (min !== null) return `${wholePeso(min)} and up`
  if (max !== null) return `Up to ${wholePeso(max)}`
  return ''
})
function clearPrice() {
  filters.minRent = null
  filters.maxRent = null
}
const floors = computed(() => floorSummaries(props.rooms, filters))
const singleFloor = computed(() => floors.value.length === 1)
const floorKey = ref<string | null>(null)
const floor = computed(() => (singleFloor.value ? floors.value[0] : floors.value.find((f) => f.key === floorKey.value)) ?? null)

const selectedId = ref<number | null>(null)
const room = computed(() => props.rooms.find((r) => r.id === selectedId.value) ?? null)
/** The tapped room, if it is on the floor being shown */
const preview = computed(() => (room.value && floor.value?.allRooms.includes(room.value) ? room.value : null))
// Opening another floor clears the tapped room
watch(floorKey, () => {
  selectedId.value = null
})
</script>

<style scoped>
.filters {
  margin-bottom: 6px;
}
.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 6px;
}
.price-filter {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.price-chip {
  margin: 0;
}
.who {
  flex: 1;
  max-width: 180px;
}
.hint {
  margin: 4px 0 0;
}
/* Hint and the view switch on one line */
.hint-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 2px 0 4px;
}
.hint-row .hint {
  margin: 0;
}
.view-switch {
  flex: none;
  margin: 0;
}
.floor-head {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
.floor-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.floor-tab {
  padding: 6px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  color: var(--text-primary);
  font: inherit;
  font-family: var(--font-body);
  font-size: 13px;
  cursor: pointer;
}
.floor-tab.free {
  border-color: var(--success-solid);
}
.floor-tab.on {
  background: var(--bg-ink);
  border-color: var(--bg-ink);
  color: var(--text-on-ink);
}
.floor-tab:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
/* Two columns: floor plan and room details */
.floor-body.wide {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(280px, 1fr);
  gap: 14px;
  align-items: start;
}
.plan-col {
  min-width: 0;
}
.detail-col {
  position: sticky;
  top: 8px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
}
.pick {
  margin: 0;
  padding: 24px 4px;
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
}
.small {
  font-size: 13px;
}
</style>
