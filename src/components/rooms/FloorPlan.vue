<template>
  <div class="plan-scroll">
    <div class="plan" role="group" :aria-label="`${label}, seen from above`">
      <div v-for="row in rows" :key="row.key" class="row" :class="row.key">
        <button
          v-for="room in row.rooms"
          :key="room.id"
          type="button"
          class="room"
          :class="[room.status, { dim: !matches(room), selected: room.id === selectedId }]"
          :style="{ flexGrow: roomWeight(room) }"
          :aria-label="`Room ${room.label}, ${roomType(room)}, ${roomStatusText(room)}`"
          :aria-pressed="room.id === selectedId"
          @click="emit('select', room.id)"
        >
          <span class="name">{{ room.label }}</span>
          <span class="type">{{ roomType(room) }}<template v-if="room.who_can_stay !== 'any'"> · {{ room.who_can_stay_label }}</template></span>
          <span v-if="room.rental_mode === 'bedspaces'" class="beds" aria-hidden="true">
            <i v-for="(free, i) in bedDots(room)" :key="i" class="bed" :class="{ free }" />
          </span>
          <span class="status">{{ roomStatusText(room) }}</span>
          <span v-if="room.rent_from_centavos !== null" class="rent">{{ peso(room.rent_from_centavos).replace('.00', '') }}</span>
        </button>
        <div v-if="row.key === 'top'" class="hallway">Hallway</div>
      </div>
    </div>
  </div>
  <p class="legend muted">
    <span class="bed free" /> Free bed <span class="bed" /> Taken bed
    <span class="swatch available" /> Has space <span class="swatch full" /> Full
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { autoLayout, bedDots, roomStatusText, roomType, roomWeight } from '@/lib/floors'
import { peso } from '@/lib/money'
import type { PublicRoom } from '@/types/booking'

/** The flat floor plan, with rooms along a hallway. Tap a room to see it. */
const props = defineProps<{ rooms: PublicRoom[]; matchIds: number[]; label: string; selectedId?: number | null }>()
const emit = defineEmits<{ select: [id: number] }>()

const rows = computed(() => {
  const { top, bottom } = autoLayout(props.rooms)
  return [
    { key: 'top', rooms: top },
    ...(bottom.length ? [{ key: 'bottom', rooms: bottom }] : []),
  ]
})

function matches(room: PublicRoom): boolean {
  return props.matchIds.includes(room.id)
}
</script>

<style scoped>
.plan-scroll {
  overflow-x: auto;
  padding: 2px;
}
/* Outer wall of the floor */
.plan {
  --wall: color-mix(in srgb, var(--ion-text-color, #000) 55%, var(--ion-background-color, #fff));
  --floor: color-mix(in srgb, var(--ion-text-color, #000) 5%, var(--ion-background-color, #fff));
  min-width: min-content;
  border: 4px solid var(--wall);
  border-radius: 6px;
  background: var(--floor);
}
.row {
  display: flex;
  flex-wrap: wrap;
}
.room {
  position: relative;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  min-width: 96px;
  min-height: 104px;
  padding: 8px 8px 8px 10px;
  border: none;
  border-right: 2px solid var(--wall);
  border-bottom: 2px solid var(--wall);
  border-left: 5px solid var(--ion-color-medium);
  background: var(--ion-background-color, #fff);
  color: var(--ion-text-color, #000);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.row.bottom .room {
  border-top: 2px solid var(--wall);
  border-bottom: none;
}
.room.available {
  border-left-color: var(--ion-color-success);
  background: color-mix(in srgb, var(--ion-color-success) 8%, var(--ion-background-color, #fff));
}
.room.not_ready {
  border-left-color: var(--ion-color-warning);
}
.room.dim {
  opacity: 0.4;
}
.room.selected {
  outline: 3px solid var(--ion-color-primary);
  outline-offset: -3px;
  opacity: 1;
}
.room:focus-visible {
  outline: 3px solid var(--ion-color-primary);
  outline-offset: -3px;
}
.hallway {
  flex-basis: 100%;
  padding: 7px 0;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-align: center;
  text-transform: uppercase;
  color: var(--ion-color-medium);
  background: repeating-linear-gradient(90deg, transparent 0 14px, color-mix(in srgb, var(--ion-text-color, #000) 6%, transparent) 14px 28px);
}
.name {
  font-size: 1rem;
  font-weight: 700;
}
.type {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--ion-color-medium);
}
/* Small bed icon */
.beds {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-width: 110px;
  margin: 2px 0;
}
.bed {
  display: inline-block;
  width: 10px;
  height: 15px;
  border: 2px solid var(--ion-color-medium);
  border-top-width: 5px;
  border-radius: 3px;
  background: var(--ion-color-medium);
}
.bed.free {
  border-color: var(--ion-color-success);
  background: transparent;
}
.status {
  font-size: 0.8rem;
  line-height: 1.2;
}
.room.available .status {
  color: var(--ion-color-success-shade, var(--ion-color-success));
  font-weight: 600;
}
.rent {
  margin-top: auto;
  font-size: 0.78rem;
  font-weight: 700;
}
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  margin-top: 10px;
  font-size: 0.8rem;
}
.legend .bed {
  margin-right: -6px;
}
.legend .swatch {
  display: inline-block;
  width: 12px;
  height: 12px;
  margin-right: -6px;
  border-radius: 2px;
  background: var(--ion-color-medium);
}
.legend .swatch.available {
  background: var(--ion-color-success);
}
</style>
