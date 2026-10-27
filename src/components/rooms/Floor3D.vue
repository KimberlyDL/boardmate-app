<template>
  <div>
    <Scene3D :built="built" :labels="labels" size="floor" @select="emit('select', Number($event))" />
    <p class="legend muted">
      <span class="dot free" /> Has space <span class="dot" /> Full · faded rooms don't match the filters
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, shallowRef, watch } from 'vue'
import Scene3D, { type TagLabel } from '@/components/rooms/Scene3D.vue'
import { isFreeFor, roomStatusText, roomType } from '@/lib/floors'
import { buildFloor } from '@/lib/room3d/scene'
import type { PublicRoom } from '@/types/booking'

/** One floor in 3D, with a label on each room. Tap a room to see it. */
const props = defineProps<{ rooms: PublicRoom[]; matchIds: number[]; label: string; selectedId?: number | null }>()
const emit = defineEmits<{ select: [id: number] }>()

const shape = computed(() => props.rooms.map((r) => `${r.id}:${r.rental_mode}:${r.total}:${r.capacity}`).join('|'))
// Only rebuild when the rooms change
const built = shallowRef(markRaw(buildFloor(props.rooms)))
watch(shape, () => (built.value = markRaw(buildFloor(props.rooms))))

const labels = computed<TagLabel[]>(() =>
  props.rooms.map((r) => ({
    id: String(r.id),
    text: `${r.label} · ${roomType(r)} · ${roomStatusText(r)}`,
    state: r.id === props.selectedId ? 'selected' : !props.matchIds.includes(r.id) ? 'off' : isFreeFor(r, 'any') ? 'free' : 'full',
    aria: `Room ${r.label}, ${roomType(r)}, ${roomStatusText(r)}`,
    clickable: true,
  })),
)
</script>

<style scoped>
.legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  margin-top: 8px;
  font-size: 0.8rem;
}
.dot {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--ion-color-medium);
}
.dot.free {
  background: var(--ion-color-success);
}
</style>
