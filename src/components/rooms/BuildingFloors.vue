<template>
  <div class="building">
    <div class="roof" aria-hidden="true" />
    <button
      v-for="(f, i) in floors"
      :key="f.key"
      type="button"
      class="floor"
      :class="{ free: f.freeRooms > 0, empty: !f.rooms.length, ground: i === floors.length - 1 }"
      :disabled="!f.rooms.length"
      :aria-label="`${f.label}, ${floorFreeText(f)}`"
      @click="emit('select', f.key)"
    >
      <span class="windows" aria-hidden="true"><i /><i /><i /></span>
      <span class="inner">
        <span class="label">{{ f.label }}</span>
        <span class="line">{{ floorFreeText(f) }}</span>
      </span>
      <ion-icon v-if="f.rooms.length" class="go" :icon="chevronForward" aria-hidden="true" />
    </button>
    <div class="ground-line" aria-hidden="true" />
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import { type FloorSummary, floorFreeText } from '@/lib/floors'

/** The flat building view, one row per floor. Tap a floor to open it. */
defineProps<{ floors: FloorSummary[] }>()
const emit = defineEmits<{ select: [key: string] }>()
</script>

<style scoped>
/* Slanted side wall and roof for the 3D look */
.building {
  --depth: 26px;
  --wall: color-mix(in srgb, var(--ion-text-color, #000) 8%, var(--ion-background-color, #fff));
  --wall-side: color-mix(in srgb, var(--ion-text-color, #000) 20%, var(--ion-background-color, #fff));
  --roof: color-mix(in srgb, var(--ion-text-color, #000) 30%, var(--ion-background-color, #fff));
  --line: color-mix(in srgb, var(--ion-text-color, #000) 16%, var(--ion-background-color, #fff));
  --window: color-mix(in srgb, var(--ion-text-color, #000) 18%, var(--ion-background-color, #fff));
  position: relative;
  max-width: 420px;
  margin: 8px auto 4px;
  padding: var(--depth) calc(var(--depth) + 6px) 10px 6px;
}
.roof {
  height: var(--depth);
  margin-top: calc(-1 * var(--depth));
  background: var(--roof);
  transform: skewX(-45deg);
  transform-origin: bottom left;
  border-radius: 3px 3px 0 0;
}
.floor {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 62px;
  padding: 8px 12px;
  border: none;
  border-bottom: 2px solid var(--line);
  background: var(--wall);
  color: var(--ion-text-color, #000);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
/* Side wall of each floor */
.floor::after {
  content: '';
  position: absolute;
  top: 0;
  right: calc(-1 * var(--depth));
  width: var(--depth);
  height: calc(100% + 2px);
  background: var(--wall-side);
  transform: skewY(-45deg);
  transform-origin: top left;
  border-bottom: 2px solid var(--line);
}
.floor.ground {
  border-bottom-width: 0;
}
.floor:not(:disabled):hover,
.floor:focus-visible {
  background: color-mix(in srgb, var(--ion-color-primary) 12%, var(--wall));
}
.floor:focus-visible {
  outline: 3px solid var(--ion-color-primary);
  outline-offset: -3px;
}
.floor.empty {
  cursor: default;
}
.floor.empty .inner,
.floor.empty .windows {
  opacity: 0.45;
}
.windows {
  display: grid;
  grid-template-columns: repeat(3, 10px);
  gap: 4px;
}
.windows i {
  height: 16px;
  border-radius: 2px;
  background: var(--window);
}
.floor.free .windows i {
  background: var(--ion-color-success);
  box-shadow: 0 0 6px color-mix(in srgb, var(--ion-color-success) 60%, transparent);
}
.inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.label {
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.line {
  font-size: 0.85rem;
  color: var(--ion-color-medium);
}
.floor.free .line {
  color: var(--ion-color-success-shade, var(--ion-color-success));
  font-weight: 600;
}
.go {
  font-size: 1.1rem;
  color: var(--ion-color-medium);
}
.ground-line {
  height: 6px;
  margin: 0 calc(-1 * var(--depth) - 6px) 0 -6px;
  border-radius: 3px;
  background: var(--line);
}
</style>
