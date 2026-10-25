<template>
  <span v-if="variant === 'amenity'" class="dl-chip amenity">
    <component :is="icon" v-if="icon" :size="14" class="amenity-icon" aria-hidden="true" />
    <slot />
  </span>
  <button v-else type="button" class="dl-chip filter" :class="{ selected }" :aria-pressed="selected" data-dl-focus>
    <component :is="icon" v-if="icon" :size="14" aria-hidden="true" />
    <slot />
    <span v-if="count !== undefined" class="count">{{ count }}</span>
  </button>
</template>

<script setup lang="ts">
import type { IconComponent } from './types'

/** filter: a tappable pill (ink when selected) · amenity: a read-only muted pill. */
withDefaults(
  defineProps<{
    variant?: 'filter' | 'amenity'
    selected?: boolean
    count?: number
    icon?: IconComponent
  }>(),
  { variant: 'filter', count: undefined, icon: undefined },
)
</script>

<style scoped>
.dl-chip {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-full);
  font-family: var(--font-body);
  font-size: 13px;
  white-space: nowrap;
}
.amenity {
  padding: 6px 12px;
  background: var(--bg-muted);
  color: var(--text-primary);
}
.amenity-icon { color: var(--text-muted); }
.filter {
  height: 34px;
  padding: 0 14px;
  border: 0;
  background: var(--bg-surface);
  box-shadow: inset 0 0 0 1px var(--border-default);
  color: var(--text-primary);
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out);
}
.filter.selected {
  background: var(--bg-ink);
  box-shadow: none;
  color: var(--text-on-ink);
  font-weight: 700;
}
.count {
  padding: 1px 6px;
  border-radius: var(--radius-full);
  background: var(--bg-muted);
  font-family: var(--font-mono);
  font-size: 10px;
}
.selected .count { background: rgb(255 255 255 / 0.2); }
</style>
