<template>
  <span
    class="dl-skeleton"
    :class="[`tone-${tone}`, { animated }]"
    :style="{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px`, borderRadius: typeof radius === 'number' ? `${radius}px` : radius }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
/**
 * A loading bone. Bones mirror the real layout one to one; surfaces, nav and dividers stay real.
 * neutral: on white cards · brand: on colored cards · surface: a white bone on the canvas.
 */
withDefaults(
  defineProps<{ width?: number | string; height?: number; radius?: number | string; tone?: 'neutral' | 'brand' | 'surface'; animated?: boolean }>(),
  { width: '100%', height: 12, radius: 6, tone: 'neutral', animated: true },
)
</script>

<style scoped>
.dl-skeleton {
  display: block;
  flex-shrink: 0;
  background-repeat: no-repeat;
  background-size: 200% 100%;
}
.tone-neutral { background-color: var(--skeleton-neutral); }
.tone-brand { background-color: var(--skeleton-brand); }
.tone-surface { background-color: var(--bg-surface); }
.animated:not(.tone-surface) {
  background-image: linear-gradient(90deg, transparent 0%, var(--skeleton-highlight) 50%, transparent 100%);
  animation: dl-shimmer 1.4s linear infinite;
}
</style>
