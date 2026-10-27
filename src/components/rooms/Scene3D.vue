<template>
  <div class="view3d" :class="[size, { zoomed, dragging }]">
    <div
      ref="host"
      class="host"
      @pointerdown="dragStart"
      @pointermove="dragMove"
      @pointerup="dragEnd"
      @pointercancel="dragEnd"
    />
    <div ref="tagBox" class="tags">
      <template v-for="t in labels" :key="t.id">
        <button
          v-if="t.clickable"
          type="button"
          class="tag"
          :data-id="t.id"
          :class="t.state"
          :style="place(t.id)"
          :aria-label="t.aria"
          :aria-pressed="t.state === 'selected'"
          @click="emit('select', t.id)"
        >
          {{ t.text }}
        </button>
        <span v-else class="tag" :class="t.state" :data-id="t.id" :style="place(t.id)" :aria-label="t.aria">{{ t.text }}</span>
      </template>
    </div>
    <div class="zoom">
      <button type="button" aria-label="Zoom in" @click="zoomBy(1.3)">+</button>
      <button type="button" aria-label="Zoom out" @click="zoomBy(1 / 1.3)">−</button>
      <button v-if="zoomed" type="button" class="fit" aria-label="Show everything" @click="resetZoom">Fit</button>
    </div>
    <p v-if="zoomed" class="drag-hint" aria-hidden="true">Drag to look around</p>
  </div>
</template>

<script setup lang="ts">
import { markRaw, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { type Built, View3D } from '@/lib/room3d/scene'

/** A label shown on top of the 3D view */
export interface TagLabel {
  id: string
  text: string
  /** free, full, off (faded by the filters) or selected */
  state: 'free' | 'full' | 'off' | 'selected'
  aria: string
  clickable: boolean
}

/** Shows a 3D scene with labels you can tap. `size` sets how tall it is. */
const props = defineProps<{ built: Built; labels: TagLabel[]; size: 'building' | 'floor' | 'room' }>()
const emit = defineEmits<{ select: [id: string] }>()

const host = ref<HTMLElement | null>(null)
const tagBox = ref<HTMLElement | null>(null)
const view = shallowRef<View3D | null>(null)
const spots = reactive<Record<string, { x: number; y: number }>>({})
let observer: ResizeObserver | null = null

// Zoom and drag (you can only drag when zoomed in)
const zoomed = ref(false)
const dragging = ref(false)
let last: { id: number; x: number; y: number } | null = null

function zoomBy(k: number) {
  view.value?.zoomBy(k)
  zoomed.value = !!view.value?.zoomed
}
function resetZoom() {
  view.value?.resetZoom()
  zoomed.value = false
}
function dragStart(e: PointerEvent) {
  if (!zoomed.value || last) return
  last = { id: e.pointerId, x: e.clientX, y: e.clientY }
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function dragMove(e: PointerEvent) {
  if (!last || e.pointerId !== last.id) return
  view.value?.panBy(e.clientX - last.x, e.clientY - last.y)
  last = { id: e.pointerId, x: e.clientX, y: e.clientY }
}
function dragEnd(e: PointerEvent) {
  if (!last || e.pointerId !== last.id) return
  last = null
  dragging.value = false
}

function place(id: string) {
  const p = spots[id]
  return p ? { transform: `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)` } : { visibility: 'hidden' as const }
}

async function updateSpots() {
  if (!view.value) return
  for (const t of props.built.tags) spots[t.id] = view.value.project(t.pos)
  // Keep the labels inside the box
  await nextTick()
  const width = host.value?.clientWidth ?? 0
  for (const el of Array.from(tagBox.value?.querySelectorAll<HTMLElement>('.tag') ?? [])) {
    const spot = spots[el.dataset.id ?? '']
    if (!spot) continue
    const half = el.offsetWidth / 2 + 6
    spot.x = Math.min(Math.max(spot.x, half), Math.max(half, width - half))
  }
}

onMounted(() => {
  if (!host.value) return
  view.value = markRaw(new View3D(host.value, updateSpots))
  view.value.show(props.built)
  observer = new ResizeObserver(() => view.value?.resize())
  observer.observe(host.value)
})

watch(
  () => props.built,
  (b) => {
    view.value?.show(b)
    zoomed.value = false
  },
)
// Move the labels again when their text changes
watch(() => props.labels, updateSpots, { flush: 'post' })

onBeforeUnmount(() => {
  observer?.disconnect()
  view.value?.dispose()
  view.value = null
})
</script>

<style scoped>
.view3d {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-lg);
  background: radial-gradient(
    ellipse at 50% 40%,
    var(--bg-surface) 0%,
    var(--bg-muted) 100%
  );
}
.view3d.building {
  height: clamp(240px, 38vh, 420px);
}
.view3d.floor {
  height: clamp(260px, 44vh, 420px);
}
.view3d.room {
  height: clamp(190px, 30vh, 280px);
}
@media (min-width: 768px) and (min-height: 700px) {
  .view3d.building {
    height: clamp(300px, 50vh, 540px);
  }
  .view3d.floor {
    height: clamp(320px, 56vh, 600px);
  }
  .view3d.room {
    height: clamp(240px, 36vh, 360px);
  }
}
.host,
.tags {
  position: absolute;
  inset: 0;
}
.host :deep(canvas) {
  display: block;
}
/* When zoomed in, drag to move around */
.zoomed .host {
  cursor: grab;
  touch-action: none;
}
.zoomed.dragging .host {
  cursor: grabbing;
}
.drag-hint {
  position: absolute;
  bottom: 8px;
  left: 50%;
  margin: 0;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  transform: translateX(-50%);
  background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
  color: var(--text-muted);
  font-family: var(--font-body);
  font-size: 12px;
  pointer-events: none;
}
.zoomed.dragging .drag-hint {
  opacity: 0;
}
.zoom .fit {
  width: auto;
  padding: 0 6px;
  font-size: 0.72rem;
}
.tags {
  pointer-events: none;
}
.tag {
  position: absolute;
  top: 0;
  left: 0;
  padding: 3px 9px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
  color: var(--text-primary);
  font: inherit;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
}
button.tag {
  cursor: pointer;
}
.tag::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 6px;
  border-radius: 50%;
  background: var(--stone-400);
}
.tag.free::before {
  background: var(--success-solid);
}
.tag.full,
.tag.off {
  color: var(--text-muted);
}
.tag.off {
  opacity: 0.55;
}
.tag.selected {
  background: var(--bg-ink);
  border-color: var(--bg-ink);
  color: var(--text-on-ink);
}
.tag.selected::before {
  background: var(--brand-accent);
}
.tag:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.zoom {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  gap: 4px;
}
.zoom button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
  color: var(--text-primary);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
</style>
