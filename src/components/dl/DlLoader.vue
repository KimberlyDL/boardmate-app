<template>
  <span class="dl-loader" :class="[`variant-${variant}`, { stacked: !!label }]" role="status" :aria-label="label || 'Loading'">
    <svg v-if="variant === 'house'" :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true">
      <path class="outline" :d="HOUSE" />
      <path class="trace" :d="HOUSE_WITH_DOOR" />
    </svg>
    <svg v-else :width="size" :height="size" viewBox="0 0 24 24" aria-hidden="true" class="ring">
      <circle class="track" cx="12" cy="12" r="9" />
      <path class="arc" d="M12 3a9 9 0 0 1 9 9" />
    </svg>
    <span v-if="label" class="label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
/**
 * DormLink's loading mark (owner choice 2026-11-07: "house trace").
 * house: a small house drawn and erased, for page and card waits (brand colors).
 * ring: a spinning ring in the current text color, for buttons and tight spots.
 * Busy buttons get the ring automatically (lib/busyButtons.ts); use this for the rest.
 * With "reduce motion" on, both pulse gently instead of moving.
 */
withDefaults(defineProps<{ variant?: 'house' | 'ring'; size?: number; label?: string }>(), {
  variant: 'house',
  size: 32,
  label: '',
})

const HOUSE = 'M5 15 L16 6 L27 15 L27 27 L5 27 Z'
const HOUSE_WITH_DOOR = `${HOUSE} M13 27 L13 19 L19 19 L19 27`
</script>

<style scoped>
.dl-loader {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  line-height: 0;
}
.dl-loader.stacked {
  display: flex;
  flex-direction: column;
  padding: 32px 16px;
  line-height: normal;
}
.label {
  font-size: 13px;
  color: var(--text-muted);
}
.outline,
.trace {
  fill: none;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.outline {
  stroke: var(--brand-accent);
  stroke-opacity: 0.45;
  stroke-width: 1.6;
}
.trace {
  stroke: var(--brand-primary);
  stroke-width: 2;
  stroke-dasharray: 120;
  animation: dl-trace 1.8s ease-in-out infinite;
}
.ring {
  color: currentColor;
  animation: dl-spin 0.9s linear infinite;
}
.track {
  fill: none;
  stroke: currentColor;
  stroke-opacity: 0.25;
  stroke-width: 3;
}
.arc {
  fill: none;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
}
@media (prefers-reduced-motion: reduce) {
  .trace,
  .ring {
    stroke-dashoffset: 0 !important;
    animation: dl-breathe 1.6s ease-in-out infinite !important;
  }
}
</style>
