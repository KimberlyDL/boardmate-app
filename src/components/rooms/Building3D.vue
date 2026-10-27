<template>
  <Scene3D :built="built" :labels="labels" size="building" @select="emit('select', $event)" />
</template>

<script setup lang="ts">
import { computed, markRaw, shallowRef, watch } from 'vue'
import Scene3D, { type TagLabel } from '@/components/rooms/Scene3D.vue'
import { type FloorSummary, floorFreeText, floorShort } from '@/lib/floors'
import { buildBuilding } from '@/lib/room3d/scene'

/** The building in 3D, with a label on each floor. Tap a floor to open it. */
const props = defineProps<{ floors: FloorSummary[] }>()
const emit = defineEmits<{ select: [key: string] }>()

// Only rebuild when the rooms change
const shape = computed(() => props.floors.map((f) => `${f.key}:${f.allRooms.map((r) => r.id).join(',')}`).join('|'))
// The list starts from the top floor, but the building is built from the bottom
const make = () => markRaw(buildBuilding([...props.floors].reverse().map((f) => ({ id: f.key, rooms: f.allRooms }))))
const built = shallowRef(make())
watch(shape, () => (built.value = make()))

const labels = computed<TagLabel[]>(() =>
  props.floors.map((f) => ({
    id: f.key,
    text: `${floorShort(f.floor)} · ${floorFreeText(f)}`,
    state: !f.rooms.length ? 'off' : f.freeRooms ? 'free' : 'full',
    aria: `${f.label}, ${floorFreeText(f)}`,
    clickable: f.rooms.length > 0,
  })),
)
</script>
