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
import { slotsText } from '@/lib/floors'
import { clusterPoints, FAN_OUT_ZOOM, fanOutOffsets } from '@/lib/mapClusters'
import { peso } from '@/lib/money'
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM } from '@/lib/site'

export interface MapListing {
  id: number
  name: string
  latitude: number | null
  longitude: number | null
  price_from_centavos: number | null
  is_full?: boolean
  /** Free bedspaces and whole rooms, shown in the pin's bubble */
  availability?: { available: number }
}

/** A small building drawn in the pin's colour. */
const BUILDING_SVG =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M4 22V4l8-2v4l8 2v14h-6v-4h-4v4H4zm3-15v2h2V7H7zm0 4v2h2v-2H7zm0 4v2h2v-2H7zm8-4v2h2v-2h-2zm0 4v2h2v-2h-2z"/></svg>'

/**
 * Dorm Finder map: one building pin per place, with a bubble saying how many
 * slots are free ("3 slots", green) or "Full" (grey), and its "from" price
 * under the building. `origin` is the point distance is
 * measured from; with `radiusM` a dashed circle shows the area searched and
 * the map fits it. Emits `select` on a pin tap (null on a tap elsewhere),
 * `search-area` (south, west, north, east) and, while `picking`, `pick` with
 * the tapped point.
 */
const props = defineProps<{
  listings: MapListing[]
  searchable?: boolean
  height?: string
  selectedId?: number | null
  origin?: { lat: number; lng: number; label: string } | null
  /** Draw this circle (metres) around `origin` and show its whole area */
  radiusM?: number | null
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
  const bubble = full ? 'Full' : listing.availability ? slotsText(listing.availability.available) : 'Free rooms'
  const price = listing.price_from_centavos !== null ? peso(listing.price_from_centavos).replace('.00', '') : '₱—'
  const classes = ['pin', full ? 'full' : 'free', listing.id === props.selectedId ? 'selected' : ''].join(' ')
  const html =
    `<span class="${classes}"><span class="bubble">${bubble}</span>` +
    `<span class="building">${BUILDING_SVG}</span>${full ? '' : `<span class="price">${price}</span>`}</span>`
  return L.divIcon({ className: 'building-marker', html, iconSize: undefined })
}

/** Several places whose pins would overlap: their free slots in the bubble, how many under the building. */
function clusterIcon(members: MapListing[]): L.DivIcon {
  const free = members.filter((l) => !l.is_full)
  const slots = free.reduce((sum, l) => sum + (l.availability?.available ?? 0), 0)
  const bubble = free.length ? slotsText(slots) : 'Full'
  const selected = members.some((l) => l.id === props.selectedId)
  const classes = ['pin', 'cluster', free.length ? 'free' : 'full', selected ? 'selected' : ''].join(' ')
  const html =
    `<span class="${classes}"><span class="bubble">${bubble}</span>` +
    `<span class="building">${BUILDING_SVG}<span class="count">${members.length}</span></span>` +
    `<span class="price">${members.length} places</span></span>`
  return L.divIcon({ className: 'building-marker', html, iconSize: undefined })
}

function addPin(l: MapListing, pos: L.LatLng) {
  L.marker(pos, { icon: pinIcon(l), title: l.name, zIndexOffset: l.is_full ? 0 : 500 })
    .on('click', (e) => {
      L.DomEvent.stopPropagation(e)
      emit('select', l.id)
    })
    .addTo(layer!)
}

/**
 * Pins for the current zoom: places whose pins would overlap on screen are
 * one cluster pin (tap: zoom in on them); at the closest zooms, places still
 * on top of each other are fanned out in a ring so each can be tapped.
 */
function renderMarkers() {
  if (!map || !layer) return
  const m = map
  layer.clearLayers()
  const placed = props.listings.filter((l) => l.latitude !== null && l.longitude !== null)
  const byId = new Map(placed.map((l) => [l.id, l]))
  const screen = placed.map((l) => ({ id: l.id, ...m.latLngToLayerPoint([l.latitude!, l.longitude!]) }))
  // Zoom moves in quarter steps, so "close enough to the fan-out zoom" is anything past the level below it.
  const fanOut = m.getZoom() > FAN_OUT_ZOOM - 1
  for (const group of clusterPoints(screen)) {
    const members = group.ids.map((id) => byId.get(id)!)
    if (members.length === 1) {
      addPin(members[0], L.latLng(members[0].latitude!, members[0].longitude!))
    } else if (fanOut) {
      const offsets = fanOutOffsets(members.length)
      members.forEach((l, i) => addPin(l, m.layerPointToLatLng(L.point(group.x + offsets[i].x, group.y + offsets[i].y))))
    } else {
      const bounds = L.latLngBounds(members.map((l) => L.latLng(l.latitude!, l.longitude!)))
      L.marker(m.layerPointToLatLng(L.point(group.x, group.y)), {
        icon: clusterIcon(members),
        title: `${members.length} places: ${members.map((l) => l.name).join(', ')}`,
        zIndexOffset: 1000,
      })
        .on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          // Places nearly next door never split by zooming: go straight to the zoom that fans them out.
          if (m.getBoundsZoom(bounds, false, L.point(140, 140)) > FAN_OUT_ZOOM - 1) {
            m.setView(bounds.getCenter(), FAN_OUT_ZOOM)
          } else {
            m.fitBounds(bounds, { padding: [70, 70], maxZoom: FAN_OUT_ZOOM })
          }
        })
        .addTo(layer)
    }
  }
}

function draw() {
  if (!map || !layer) return
  renderMarkers()
  const points = props.listings.filter((l) => l.latitude !== null && l.longitude !== null).map((l) => L.latLng(l.latitude!, l.longitude!))
  // With a radius the map shows the circle's area instead (drawOrigin).
  if (points.length && !moved.value && !hasRadius()) {
    fit(L.latLngBounds(points))
  }
}

function hasRadius(): boolean {
  return !!props.origin && !!props.radiusM
}

function fit(bounds: L.LatLngBounds, padding = 40) {
  if (!map) return
  fitting = true
  map.fitBounds(bounds, { padding: [padding, padding], maxZoom: 16, animate: false })
  setTimeout(() => (fitting = false), 50)
}

function drawOrigin() {
  if (!map || !originLayer) return
  originLayer.clearLayers()
  if (!props.origin) return
  const center: L.LatLngExpression = [props.origin.lat, props.origin.lng]
  if (props.radiusM) {
    const circle = L.circle(center, {
      radius: props.radiusM,
      color: '#3880ff',
      weight: 2,
      dashArray: '6 6',
      fillColor: '#3880ff',
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(originLayer)
    fit(circle.getBounds(), 12)
  }
  L.circleMarker(center, { radius: 9, color: '#fff', weight: 3, fillColor: '#3880ff', fillOpacity: 1 })
    .bindTooltip(props.origin.label, { permanent: true, direction: 'top', offset: [0, -8], className: 'origin-label', pane: 'originLabel' })
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
  // Quarter zoom steps, so a search circle fills the map instead of jumping a whole level smaller.
  map = L.map(mapEl.value, { zoomSnap: 0.25 }).setView(DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)
  // The campus name sits under the pins (Leaflet puts labels above them), so it never hides a place.
  map.createPane('originLabel').style.zIndex = '550'
  originLayer = L.layerGroup().addTo(map)
  layer = L.layerGroup().addTo(map)
  map.on('moveend', () => {
    if (!fitting) moved.value = true
  })
  // Which pins overlap depends on the zoom.
  map.on('zoomend', renderMarkers)
  map.on('click', (e: L.LeafletMouseEvent) => {
    if (props.picking) emit('pick', e.latlng.lat, e.latlng.lng)
    else emit('select', null)
  })
  draw()
  drawOrigin()
  // The map gets its real size after the page settles; fit the circle again then.
  setTimeout(() => {
    const userMoved = moved.value
    fitting = true // resizing is not the user moving the map
    map?.invalidateSize()
    fitting = false
    if (hasRadius() && !userMoved) drawOrigin()
  }, 300)
})

watch(() => props.listings, draw, { deep: true })
watch(() => props.selectedId, renderMarkers)
watch(
  () => [props.origin, props.radiusM],
  () => {
    moved.value = false
    drawOrigin()
  },
  { deep: true },
)

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
/* Bubble on top, building in the middle, price under it; the building's
   base sits on the place's point. */
.building-marker .pin {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  white-space: nowrap;
  transform: translate(-50%, calc(-100% + 14px));
  --pin: var(--ion-color-success, #2dd36f);
}
.building-marker .pin.full {
  --pin: var(--ion-color-medium, #92949c);
}
.building-marker .bubble {
  position: relative;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--pin);
  color: #fff;
  font-weight: 600;
  font-size: 11px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
.building-marker .bubble::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -4px;
  margin-left: -4px;
  border: 4px solid transparent;
  border-bottom: none;
  border-top-color: var(--pin);
}
.building-marker .building {
  display: flex;
  margin-top: 3px;
  padding: 3px;
  border-radius: 8px;
  background: #fff;
  color: var(--pin);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
.building-marker .price {
  padding: 0 5px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.9);
  color: #222;
  font-weight: 700;
  font-size: 11px;
}
.building-marker .pin.selected .building {
  outline: 3px solid var(--ion-color-primary, #3880ff);
}
.building-marker .pin.selected .bubble {
  font-size: 12px;
}
/* A cluster: the building carries a count badge, "5 places" sits under it. */
.building-marker .cluster .building {
  position: relative;
  padding: 5px;
  border: 2px solid var(--pin);
}
.building-marker .cluster .count {
  position: absolute;
  top: -8px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: #222;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}
.origin-label {
  font-family: var(--font-body);
  font-weight: 700;
}
</style>
