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
  /* Stone walls, like the design system's room slabs */
  --wall: var(--bg-muted);
  --wall-side: color-mix(in srgb, var(--text-primary) 12%, var(--bg-muted));
  --roof: color-mix(in srgb, var(--text-primary) 22%, var(--bg-muted));
  --line: var(--border-default);
  --window: color-mix(in srgb, var(--text-primary) 14%, var(--bg-muted));
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
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
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
  color: var(--text-primary);
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
  background: color-mix(in srgb, var(--brand-primary) 12%, var(--wall));
}
.floor:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
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
  background: var(--success-solid);
  box-shadow: 0 0 6px color-mix(in srgb, var(--success-solid) 60%, transparent);
}
.inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}
.label {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.line {
  font-family: var(--font-body);
  font-size: 14px;
  color: var(--text-secondary);
}
.floor.free .line {
  color: var(--success-text);
  font-weight: 700;
}
.go {
  font-size: 1.1rem;
  color: var(--text-muted);
}
.ground-line {
  height: 6px;
  margin: 0 calc(-1 * var(--depth) - 6px) 0 -6px;
  border-radius: 3px;
  background: var(--line);
}
</style>
