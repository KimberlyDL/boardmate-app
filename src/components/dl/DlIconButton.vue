<template>
  <button
    type="button"
    class="dl-icon-button"
    :class="[`variant-${variant}`, `size-${size}`]"
    :aria-label="badge ? `${label}, ${badge} unread` : label"
    :aria-pressed="active || undefined"
    :disabled="disabled"
    data-dl-focus
    @click="go"
  >
    <component :is="icon" :size="size === 'sm' ? 18 : 20" :style="active ? { color: activeColor } : undefined" aria-hidden="true" />
    <span v-if="badge" class="badge" aria-hidden="true">{{ badge > 99 ? '99+' : badge }}</span>
  </button>
</template>

<script setup lang="ts">
import type { IconComponent } from './types'
import { useTap } from './useTap'

/** An icon-only button (44px tap target). `label` is required: screen readers read it. */
const props = withDefaults(
  defineProps<{
    icon: IconComponent
    label: string
    variant?: 'surface' | 'tonal' | 'ghost' | 'primary'
    size?: 'sm' | 'md'
    active?: boolean
    activeColor?: string
    /** A small count in the corner, e.g. unread notifications. */
    badge?: number
    disabled?: boolean
    to?: string
  }>(),
  { variant: 'surface', size: 'md', activeColor: 'var(--card-rose-solid)', badge: 0, to: undefined },
)

const { go } = useTap(props)
</script>

<style scoped>
.dl-icon-button {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out);
}
.dl-icon-button:active { transform: scale(0.96); }
.dl-icon-button:disabled { opacity: 0.5; cursor: default; }
.size-md { width: 44px; height: 44px; }
.size-sm { width: 36px; height: 36px; border-radius: 10px; }
.variant-surface { background: var(--bg-surface); color: var(--text-primary); }
.variant-tonal { background: var(--brand-primary-subtle); color: var(--brand-primary-hover); }
.variant-ghost { background: transparent; color: var(--text-primary); }
.variant-primary { background: var(--brand-primary); color: var(--text-on-primary); }
.badge {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--danger-solid);
  color: #ffffff;
  font-family: var(--font-mono);
  font-size: 9px;
  line-height: 1;
}
:root.ion-palette-dark .badge { color: var(--text-on-primary); }
</style>
