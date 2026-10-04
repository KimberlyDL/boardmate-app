<template>
  <div class="listing-map">
    <div ref="mapEl" class="map" />
    <ion-button v-if="moved && searchable" size="small" class="search-area" @click="searchHere">
      <ion-icon slot="start" :icon="searchOutline" /> Search this area
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue'
import { searchOutline } from 'ionicons/icons'
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
}

/**
 * Dorm Finder map: price-label markers. Emits `select` on marker tap and
 * `search-area` (south, west, north, east) when the user asks to search the
 * visible area.
 */
const props = defineProps<{ listings: MapListing[]; searchable?: boolean; height?: string }>()
const emit = defineEmits<{ select: [id: number]; 'search-area': [bbox: [number, number, number, number]] }>()

const mapEl = ref<HTMLElement | null>(null)
const moved = ref(false)
let map: L.Map | null = null
let layer: L.LayerGroup | null = null
let fitting = false

function priceIcon(listing: MapListing): L.DivIcon {
  const label = listing.price_from_centavos !== null ? peso(listing.price_from_centavos).replace('.00', '') : '₱—'
  return L.divIcon({ className: 'price-marker', html: `<span>${label}</span>`, iconSize: undefined })
}

function draw() {
  if (!map || !layer) return
  layer.clearLayers()
  const points: L.LatLng[] = []
  for (const l of props.listings) {
    if (l.latitude === null || l.longitude === null) continue
    const pos = L.latLng(l.latitude, l.longitude)
    points.push(pos)
    L.marker(pos, { icon: priceIcon(l), title: l.name }).on('click', () => emit('select', l.id)).addTo(layer)
  }
  if (points.length && !moved.value) {
    fitting = true
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 })
    setTimeout(() => (fitting = false), 300)
  }
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
  layer = L.layerGroup().addTo(map)
  map.on('moveend', () => {
    if (!fitting) moved.value = true
  })
  draw()
  setTimeout(() => map?.invalidateSize(), 300)
})

watch(() => props.listings, draw, { deep: true })

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
  border-radius: 8px;
  overflow: hidden;
}
.search-area {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
}
</style>

<style>
.price-marker span {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 12px;
  background: var(--ion-color-primary, #3880ff);
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
  transform: translate(-50%, -50%);
}
</style>
