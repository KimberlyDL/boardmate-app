<template>
  <div class="listing-map" :class="{ picking }">
    <div ref="mapEl" class="map" />
    <ion-button v-if="moved && searchable && !picking" size="small" class="search-area" @click="searchHere">
      <Search slot="start" :size="18" aria-hidden="true" /> Search this area
    </ion-button>
    <div v-if="picking" class="pick-hint">Tap the map to choose the point to measure from</div>
  </div>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import { Search } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { peso } from '@/lib/money'

export interface MapListing {
  id: number
  name: string
  latitude: number | null
  longitude: number | null
  price_from_centavos: number | null
  is_full?: boolean
}

/**
 * Dorm Finder map: one pin per place, green with its "from" price when it has
 * a free room, grey "Full" when not. `origin` is the point distance is
 * measured from. Emits `select` on a pin tap (null on a tap elsewhere),
 * `search-area` (south, west, north, east) and, while `picking`, `pick` with
 * the tapped point.
 */
const props = defineProps<{
  listings: MapListing[]
  searchable?: boolean
  height?: string
  selectedId?: number | null
  origin?: { lat: number; lng: number; label: string } | null
  picking?: boolean
}>()
const emit = defineEmits<{
  select: [id: number | null]
  'search-area': [bbox: [number, number, number, number]]
  pick: [lat: number, lng: number]
}>()

const mapEl = ref<HTMLElement | null>(null)
const moved = ref(false)
let map: L.Map | null = null
let layer: L.LayerGroup | null = null
let originLayer: L.LayerGroup | null = null
let fitting = false

function pinIcon(listing: MapListing): L.DivIcon {
  const full = !!listing.is_full
  const label = full ? 'Full' : listing.price_from_centavos !== null ? peso(listing.price_from_centavos).replace('.00', '') : '₱—'
  const classes = ['pin', full ? 'full' : 'free', listing.id === props.selectedId ? 'selected' : ''].join(' ')
  return L.divIcon({ className: 'price-marker', html: `<span class="${classes}">${label}</span>`, iconSize: undefined })
}

function draw() {
  if (!map || !layer) return
  layer.clearLayers()
  const points: L.LatLng[] = []
  for (const l of props.listings) {
    if (l.latitude === null || l.longitude === null) continue
    const pos = L.latLng(l.latitude, l.longitude)
    points.push(pos)
    L.marker(pos, { icon: pinIcon(l), title: l.name, zIndexOffset: l.is_full ? 0 : 500 })
      .on('click', (e) => {
        L.DomEvent.stopPropagation(e)
        emit('select', l.id)
      })
      .addTo(layer)
  }
  if (points.length && !moved.value) {
    fitting = true
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 })
    setTimeout(() => (fitting = false), 300)
  }
}

function drawOrigin() {
  if (!map || !originLayer) return
  originLayer.clearLayers()
  if (!props.origin) return
  L.circleMarker([props.origin.lat, props.origin.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#0079ba', fillOpacity: 1 })
    .bindTooltip(props.origin.label, { permanent: true, direction: 'top', offset: [0, -8], className: 'origin-label' })
    .addTo(originLayer)
}

function searchHere() {
  if (!map) return
  const b = map.getBounds()
  emit('search-area', [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()])
  moved.value = false
}

onMounted(() => {
  if (!mapEl.value) return
  map = L.map(mapEl.value).setView([14.5995, 120.9842], 12) // Manila
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  originLayer = L.layerGroup().addTo(map)
  layer = L.layerGroup().addTo(map)
  map.on('moveend', () => {
    if (!fitting) moved.value = true
  })
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (props.picking) emit('pick', e.latlng.lat, e.latlng.lng)
    else emit('select', null)
  })
  draw()
  drawOrigin()
  setTimeout(() => map?.invalidateSize(), 300)
})

watch(() => [props.listings, props.selectedId], draw, { deep: true })
watch(() => props.origin, drawOrigin, { deep: true })

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<style scoped>
.listing-map {
  position: relative;
}
.map {
  height: v-bind('props.height ?? "60vh"');
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.picking .map {
  cursor: crosshair;
}
.search-area {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
}
.pick-hint {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  padding: 6px 12px;
  border-radius: 16px;
  background: var(--bg-ink);
  color: var(--text-on-ink);
  font-size: 13px;
  white-space: nowrap;
}
</style>

<style>
/* Map pins: Pine price pills; full places in Stone; the selected one in ink. */
.price-marker .pin {
  display: inline-block;
  padding: 6px 10px;
  border-radius: 999px;
  color: var(--text-on-primary);
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
  transform: translate(-50%, -50%);
}
.price-marker .pin.free {
  background: var(--brand-primary);
}
.price-marker .pin.full {
  background: var(--stone-400);
  color: #ffffff;
  font-family: var(--font-body);
  font-size: 12px;
}
.price-marker .pin.selected {
  padding: 8px 12px;
  background: var(--bg-ink);
  color: var(--text-on-ink);
  outline: 3px solid #ffffff;
  font-size: 14px;
}
.origin-label {
  font-family: var(--font-body);
  font-weight: 700;
}
</style>
