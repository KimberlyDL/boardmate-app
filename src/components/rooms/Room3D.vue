<template>
  <div class="room3d">
    <Scene3D :built="built" :labels="[]" size="room" />
    <p class="muted small">Sample {{ roomType(room).toLowerCase() }} layout. The actual room may look different.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, shallowRef, watch } from 'vue'
import Scene3D from '@/components/rooms/Scene3D.vue'
import { roomType } from '@/lib/floors'
import { roomKind, type RoomShape } from '@/lib/room3d/model'
import { buildRoom } from '@/lib/room3d/scene'

/** A sample 3D model of the room */
const props = defineProps<{ room: RoomShape }>()

// Only rebuild when it is a different kind of room
const kind = computed(() => roomKind(props.room))
const built = shallowRef(markRaw(buildRoom(props.room)))
watch(kind, () => (built.value = markRaw(buildRoom(props.room))))
</script>

<style scoped>
.room3d {
  margin: 8px 0 4px;
}
.small {
  margin: 4px 0 0;
  font-size: 0.75rem;
}
</style>
