<template>
  <span class="dl-sticker" :class="[`tone-${tone}`, `size-${size}`]" :style="rotate ? { transform: `rotate(${rotate}deg)` } : undefined"><slot /></span>
</template>

<script setup lang="ts">
import type { PaletteTone } from './types'

/** A short handwritten note (Caveat, lowercase, five words max) on a pill. One per screen. */
withDefaults(defineProps<{ tone?: PaletteTone; size?: 'sm' | 'md'; rotate?: number }>(), { tone: 'butter', size: 'md', rotate: 0 })
</script>

<style scoped>
.dl-sticker {
  display: inline-block;
  padding: 0 12px;
  border-radius: var(--radius-full);
  font-family: var(--font-decorative);
  font-weight: 700;
  white-space: nowrap;
}
.size-md { font-size: 20px; line-height: 28px; }
.size-sm { font-size: 17px; line-height: 24px; }
.tone-butter { background: var(--brand-accent); color: var(--text-on-accent); }
.tone-pine { background: var(--card-pine-tint); color: var(--card-pine-ink); }
.tone-coral { background: var(--card-coral-tint); color: var(--card-coral-ink); }
.tone-sky { background: var(--card-sky-tint); color: var(--card-sky-ink); }
.tone-lilac { background: var(--card-lilac-tint); color: var(--card-lilac-ink); }
.tone-rose { background: var(--card-rose-tint); color: var(--card-rose-ink); }
.tone-lagoon { background: var(--card-lagoon-tint); color: var(--card-lagoon-ink); }
.tone-clay { background: var(--card-clay-tint); color: var(--card-clay-ink); }
</style>
