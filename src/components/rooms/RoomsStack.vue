<template>
  <div class="rooms-stack">
    <p v-if="!slabs.length" class="muted">No rooms yet.</p>
    <div v-for="(slab, i) in slabs" :key="slab.key" class="level" :style="{ zIndex: slabs.length - i }">
      <div class="slab">
        <div class="level-label">{{ slab.label }}</div>
        <button
          v-for="tile in slab.tiles"
          :key="tile.id"
          type="button"
          class="tile"
          :class="tile.status"
          :aria-label="`Room ${tile.title}, ${statusText[tile.status]}`"
          @click="emit('select', tile.id)"
        >
          <span class="title">{{ tile.title }}</span>
          <span v-if="tile.line1" class="line">{{ tile.line1 }}</span>
          <span v-if="tile.line2" class="line small">{{ tile.line2 }}</span>
        </button>
      </div>
    </div>
    <p v-if="slabs.length" class="legend muted">
      <span class="dot available" /> Available <span class="dot full" /> Full <span class="dot not_ready" /> Not ready
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { floorName } from '@/lib/floors'

export type TileStatus = 'available' | 'full' | 'not_ready'

export interface StackTile {
  id: number
  floor: number | null
  title: string
  status: TileStatus
  line1?: string
  line2?: string
}

/**
 * "Rooms & availability" drawn as stacked floors: each floor is a slanted
 * slab with a visible edge, the highest floor on top and the lowest at the
 * bottom, with its room tiles on it. Rooms without a floor share the bottom slab. Emits
 * `select` with the tapped room's id.
 */
const props = defineProps<{ tiles: StackTile[] }>()
const emit = defineEmits<{ select: [id: number] }>()

const statusText: Record<TileStatus, string> = { available: 'available', full: 'full', not_ready: 'not ready' }

const slabs = computed(() => {
  const byFloor = new Map<string, { key: string; floor: number | null; label: string; tiles: StackTile[] }>()
  for (const tile of props.tiles) {
    const key = tile.floor === null ? 'none' : String(tile.floor)
    if (!byFloor.has(key)) {
      byFloor.set(key, { key, floor: tile.floor, label: floorName(tile.floor), tiles: [] })
    }
    byFloor.get(key)!.tiles.push(tile)
  }
  // Top floor first on screen, so the stack reads from the roof down.
  return [...byFloor.values()].sort((a, b) => (b.floor ?? -Infinity) - (a.floor ?? -Infinity))
})
</script>

<style scoped>
/* Each floor is a slanted Stone slab with a solid edge; slabs overlap a little,
   upper floors in front, so the floors read as one building. Text stays upright.
   Room tiles are tinted by status, like the design system's room cards. */
.rooms-stack {
  --slab: var(--stone-200);
  --slab-edge: var(--stone-300);
  padding: 4px 22px 8px 4px;
  overflow: hidden;
}
:global(.ion-palette-dark) .rooms-stack {
  --slab: var(--bg-muted);
  --slab-edge: var(--border-default);
}
.level {
  position: relative;
  margin-top: 6px;
}
.level:first-child {
  margin-top: 0;
}
.slab {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
  margin-left: 14px;
  padding: 10px 12px 12px;
  border-radius: var(--radius-lg);
  background: var(--slab);
  transform: skewX(-10deg);
  box-shadow: 7px 7px 0 var(--slab-edge);
}
.level-label,
.tile {
  transform: skewX(10deg);
}
.level-label {
  grid-column: 1 / -1;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 62px;
  padding: 10px 8px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-surface);
  color: var(--text-primary);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: transform var(--motion-fast) var(--ease-out);
}
.tile:active {
  transform: skewX(10deg) scale(0.97);
}
.tile:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.tile.available {
  background: var(--success-subtle);
  color: var(--success-text);
}
.tile.full {
  background: var(--bg-muted);
  color: var(--text-muted);
}
.tile.not_ready {
  background: var(--warning-subtle);
  color: var(--warning-text);
}
.title {
  font-weight: 700;
  font-size: 14px;
}
.line {
  font-size: 12px;
  line-height: 1.25;
}
.line.small {
  opacity: 0.85;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-top: 18px;
  font-size: 13px;
}
.dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 4px;
  margin-right: -6px;
}
.dot.available {
  background: var(--success-solid);
}
.dot.full {
  background: var(--stone-400);
}
.dot.not_ready {
  background: var(--warning-solid);
}
</style>
