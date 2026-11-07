<template>
  <div class="map-picker">
    <div ref="mapEl" class="map" role="application" aria-label="Map: tap to place the pin" />
    <div class="actions">
      <ion-button size="small" fill="outline" :disabled="locating" @click="useMyLocation">
        <LocateFixed slot="start" :size="18" aria-hidden="true" /> Use my location
      </ion-button>
      <ion-button v-if="modelValue" size="small" fill="clear" color="medium" @click="clear">Remove pin</ion-button>
    </div>
    <p class="muted">
      {{ modelValue ? `Pinned at ${modelValue.lat.toFixed(5)}, ${modelValue.lng.toFixed(5)}` : 'Tap the map where the property is.' }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { locate } from '@/lib/permissions'
import { IonButton } from '@ionic/vue'
import { LocateFixed } from 'lucide-vue-next'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useToast } from '@/composables/useToast'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/site'

export interface LatLng {
  lat: number
  lng: number
}

/** Leaflet + OpenStreetMap pin picker. v-model is {lat, lng} or null. */
const props = defineProps<{ modelValue: LatLng | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: LatLng | null] }>()

const toast = useToast()
const mapEl = ref<HTMLElement | null>(null)
const locating = ref(false)
let map: L.Map | null = null
let marker: L.Marker | null = null


const icon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function place(pos: LatLng, pan = false) {
  if (!map) return
  if (marker) {
    marker.setLatLng(pos)
  } else {
    marker = L.marker(pos, { icon, draggable: true }).addTo(map)
    marker.on('dragend', () => {
      const p = marker!.getLatLng()
      emit('update:modelValue', { lat: p.lat, lng: p.lng })
    })
  }
  if (pan) map.setView(pos, Math.max(map.getZoom(), 16))
}

function clear() {
  marker?.remove()
  marker = null
  emit('update:modelValue', null)
}

/** Asks nicely first, and offers settings when location was turned off (Phase 17.2). */
async function useMyLocation() {
  locating.value = true
  const value = await locate()
  locating.value = false
  if (!value) return toast.error('Could not get your location. Tap the map instead.')
  place(value, true)
  emit('update:modelValue', value)
}

onMounted(() => {
  if (!mapEl.value) return
  map = L.map(mapEl.value).setView(props.modelValue ?? DEFAULT_MAP_CENTER, props.modelValue ? 16 : DEFAULT_MAP_ZOOM)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  if (props.modelValue) place(props.modelValue)

  map.on('click', (e: L.LeafletMouseEvent) => {
    place(e.latlng)
    emit('update:modelValue', { lat: e.latlng.lat, lng: e.latlng.lng })
  })

  // Ionic animates pages in; recompute the size once it has settled.
  setTimeout(() => map?.invalidateSize(), 300)
})

watch(
  () => props.modelValue,
  (value) => {
    if (value && (!marker || !marker.getLatLng().equals(value))) place(value, true)
  },
)

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<style scoped>
.map {
  height: 280px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--ion-color-step-200, #ddd);
}
.actions {
  margin-top: 8px;
}
</style>
