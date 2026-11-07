<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="dl-viewer"
      role="dialog"
      aria-modal="true"
      :aria-label="images.length > 1 ? `Photo ${index + 1} of ${images.length}` : 'Photo'"
    >
      <div class="bar">
        <span class="count dl-data">{{ images.length > 1 ? `${index + 1} / ${images.length}` : '' }}</span>
        <button ref="closeButton" type="button" class="icon" aria-label="Close" @click="close">
          <X :size="24" aria-hidden="true" />
        </button>
      </div>

      <div
        class="stage"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
        @dblclick="toggleZoom"
        @wheel.prevent="onWheel"
        @click.self="onBackdrop"
      >
        <div v-if="pdf || failed" class="fallback">
          <FileText :size="40" aria-hidden="true" />
          <p>{{ pdf ? 'This file is a PDF.' : 'This file can’t be shown here.' }}</p>
          <button type="button" class="open" @click="openFile">Open file</button>
        </div>
        <template v-else>
          <DlLoader v-if="!loaded" class="loading" :size="44" />
          <img
            :key="current.src"
            :src="current.src"
            :alt="current.alt || (images.length > 1 ? `Photo ${index + 1}` : 'Photo')"
            :class="{ hidden: !loaded, animate: !dragging }"
            :style="{ transform: `translate(${x}px, ${y}px) scale(${scale})` }"
            draggable="false"
            @load="loaded = true"
            @error="failed = true"
          />
        </template>
      </div>

      <p v-if="current.alt" class="caption">{{ current.alt }}</p>

      <template v-if="images.length > 1">
        <button type="button" class="icon nav prev" aria-label="Previous photo" @click="go(-1)">
          <ChevronLeft :size="28" aria-hidden="true" />
        </button>
        <button type="button" class="icon nav next" aria-label="Next photo" @click="go(1)">
          <ChevronRight :size="28" aria-hidden="true" />
        </button>
      </template>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight, FileText, X } from 'lucide-vue-next'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import DlLoader from '@/components/dl/DlLoader.vue'
import { isPdfUrl, useImageViewer } from '@/composables/useImageViewer'

/**
 * The app's one photo viewer (mounted in App.vue, opened with useImageViewer()).
 * Close with ×, Esc, the phone's back button, a tap beside the photo or a swipe
 * down; arrows, arrow keys or a sideways swipe change photo; double-tap, pinch or
 * the mouse wheel zoom, and a zoomed photo can be dragged.
 */
const { images, index, isOpen, close, go } = useImageViewer()
const current = computed(() => images.value[index.value] ?? { src: '' })
const pdf = computed(() => isPdfUrl(current.value.src))

const loaded = ref(false)
const failed = ref(false)
const scale = ref(1)
const x = ref(0)
const y = ref(0)
const dragging = ref(false)
const closeButton = ref<HTMLButtonElement | null>(null)
let returnFocus: Element | null = null

const MAX_ZOOM = 4

function resetView(): void {
  scale.value = 1
  x.value = 0
  y.value = 0
}

watch(current, () => {
  loaded.value = false
  failed.value = false
  resetView()
})

watch(isOpen, async (open) => {
  if (open) {
    returnFocus = document.activeElement
    await nextTick()
    closeButton.value?.focus()
  } else {
    (returnFocus as HTMLElement | null)?.focus?.()
    returnFocus = null
  }
})

function openFile(): void {
  window.open(current.value.src, '_blank', 'noopener')
}

function onKey(e: KeyboardEvent): void {
  if (!isOpen.value) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
  else return
  e.preventDefault()
}

function toggleZoom(): void {
  if (scale.value > 1) resetView()
  else scale.value = 2.5
}

function onWheel(e: WheelEvent): void {
  scale.value = Math.min(MAX_ZOOM, Math.max(1, scale.value * (e.deltaY < 0 ? 1.15 : 1 / 1.15)))
  if (scale.value === 1) resetView()
}

/** Pointers on the photo: one finger swipes (or drags a zoomed photo), two fingers pinch. */
const pointers = new Map<number, { x: number; y: number }>()
let start = { x: 0, y: 0, panX: 0, panY: 0, distance: 0, scale: 1 }
let moved = false

const distance = () => {
  const [a, b] = [...pointers.values()]
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
}

function onDown(e: PointerEvent): void {
  if ((e.target as Element).closest('button')) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  ;(e.currentTarget as Element).setPointerCapture?.(e.pointerId)
  dragging.value = true
  moved = false
  start = { x: e.clientX, y: e.clientY, panX: x.value, panY: y.value, distance: distance(), scale: scale.value }
}

function onMove(e: PointerEvent): void {
  if (!pointers.has(e.pointerId)) return
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true

  if (pointers.size === 2 && start.distance > 0) {
    scale.value = Math.min(MAX_ZOOM, Math.max(1, (start.scale * distance()) / start.distance))
  } else if (pointers.size === 1) {
    // Zoomed: drag the photo. Not zoomed: follow the finger, to swipe.
    x.value = start.panX + dx
    y.value = scale.value > 1 ? start.panY + dy : Math.max(0, dy) * 0.6
  }
}

function onUp(e: PointerEvent): void {
  if (!pointers.has(e.pointerId)) return
  const dx = e.clientX - start.x
  const dy = e.clientY - start.y
  pointers.delete(e.pointerId)
  if (pointers.size > 0) {
    const [rest] = [...pointers.values()]
    start = { x: rest.x, y: rest.y, panX: x.value, panY: y.value, distance: 0, scale: scale.value }
    return
  }
  dragging.value = false
  if (scale.value > 1) return
  if (dy > 120 && Math.abs(dx) < 80) return close()
  if (Math.abs(dx) > 60 && Math.abs(dy) < 80) go(dx < 0 ? 1 : -1)
  resetView()
}

function onBackdrop(): void {
  if (!moved) close()
}

/** The phone's back button closes the viewer first (Ionic hands it out by priority). */
function onBackButton(e: Event): void {
  (e as CustomEvent<{ register: (priority: number, handler: (next: () => void) => void) => void }>).detail.register(
    150,
    (next) => (isOpen.value ? close() : next()),
  )
}

onMounted(() => {
  document.addEventListener('ionBackButton', onBackButton)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('ionBackButton', onBackButton)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.dl-viewer {
  position: fixed;
  inset: 0;
  z-index: 40000;
  display: flex;
  flex-direction: column;
  background: rgb(8 12 10 / 0.94);
  color: #fff;
  animation: dl-fade-in 0.15s ease-out;
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
}
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 8px 8px 16px;
  min-height: 56px;
}
.count {
  opacity: 0.8;
}
.stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
  user-select: none;
}
img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  cursor: zoom-in;
  will-change: transform;
}
img.animate {
  transition: transform 0.2s ease-out;
}
img.hidden {
  visibility: hidden;
  position: absolute;
}
.loading {
  position: absolute;
}
.caption {
  margin: 0;
  padding: 8px 16px 16px;
  text-align: center;
  font-size: 14px;
  opacity: 0.85;
}
.fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  padding: 24px;
}
.fallback p {
  margin: 0;
}
.open {
  border: 0;
  border-radius: 999px;
  padding: 12px 24px;
  font: inherit;
  font-weight: 700;
  background: var(--brand-accent);
  color: var(--text-on-accent);
  cursor: pointer;
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.1);
  color: #fff;
  cursor: pointer;
}
.icon:hover {
  background: rgb(255 255 255 / 0.2);
}
.icon:focus-visible,
.open:focus-visible {
  outline: 2px solid var(--brand-accent);
  outline-offset: 2px;
}
.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}
.prev {
  left: 12px;
}
.next {
  right: 12px;
}
@media (hover: none) {
  .nav {
    display: none;
  }
}
</style>
