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
      byFloor.set(key, { key, floor: tile.floor, label: tile.floor === null ? 'No floor set' : floorName(tile.floor), tiles: [] })
    }
    byFloor.get(key)!.tiles.push(tile)
  }
  // Top floor first on screen, so the stack reads from the roof down.
  return [...byFloor.values()].sort((a, b) => (b.floor ?? -Infinity) - (a.floor ?? -Infinity))
})

function floorName(floor: number): string {
  if (floor === 0) return 'Ground floor'
  if (floor < 0) return `Basement ${-floor}`
  const suffix = floor % 100 >= 11 && floor % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[floor % 10] ?? 'th'
  return `${floor}${suffix} floor`
}
</script>

<style scoped>
/* Each floor is a slanted slab with a visible edge; slabs overlap a little,
   upper floors in front, so the floors read as one building. Text stays upright. */
.rooms-stack {
  --slab: color-mix(in srgb, var(--ion-text-color, #000) 9%, var(--ion-background-color, #fff));
  --slab-edge: color-mix(in srgb, var(--ion-text-color, #000) 22%, var(--ion-background-color, #fff));
  padding: 4px 22px 8px 4px;
  overflow: hidden;
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
  padding: 10px 14px 14px;
  border-radius: 8px;
  background: var(--slab);
  transform: skewX(-10deg);
  box-shadow:
    7px 7px 0 var(--slab-edge),
    10px 14px 16px rgba(0, 0, 0, 0.18);
}
.level-label,
.tile {
  transform: skewX(10deg);
}
.level-label {
  grid-column: 1 / -1;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ion-color-medium);
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 62px;
  padding: 7px 8px;
  border-radius: 7px;
  border: none;
  border-top: 4px solid transparent;
  background: var(--ion-background-color, #fff);
  color: var(--ion-text-color, #000);
  text-align: left;
  font: inherit;
  cursor: pointer;
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.15);
}
.tile:focus-visible {
  outline: 3px solid var(--ion-color-primary);
}
.tile.available {
  border-top-color: var(--ion-color-success);
}
.tile.full {
  border-top-color: var(--ion-color-medium);
  opacity: 0.7;
}
.tile.not_ready {
  border-top-color: var(--ion-color-warning);
}
.title {
  font-weight: 700;
  font-size: 0.95rem;
}
.line {
  font-size: 0.78rem;
  line-height: 1.2;
}
.line.small {
  color: var(--ion-color-medium);
}
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin-top: 18px;
  font-size: 0.8rem;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: -6px;
}
.dot.available {
  background: var(--ion-color-success);
}
.dot.full {
  background: var(--ion-color-medium);
}
.dot.not_ready {
  background: var(--ion-color-warning);
}
</style>
