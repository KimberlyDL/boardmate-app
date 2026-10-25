<template>
  <span class="dl-icon-tile" :class="tone ? `solid tone-${tone}` : 'brand'" :style="{ width: `${px}px`, height: `${px}px` }" aria-hidden="true">
    <component :is="icon" :size="iconSize" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IconComponent, PaletteTone } from './types'

/**
 * An icon in a rounded tile, for list rows and category cards: 40px on the brand tint,
 * or (with a palette tone) 30px on that hue's solid color with a white icon.
 */
const props = defineProps<{
  icon: IconComponent
  tone?: PaletteTone
  size?: number
}>()

const px = computed(() => props.size ?? (props.tone ? 30 : 40))
const iconSize = computed(() => (px.value >= 40 ? 20 : 16))
</script>

<style scoped>
.dl-icon-tile {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
}
.brand { background: var(--brand-primary-subtle); color: var(--brand-primary-hover); }
.solid { border-radius: var(--radius-full); color: #ffffff; }
.tone-pine { background: var(--card-pine-solid); }
.tone-butter { background: var(--card-butter-solid); }
.tone-coral { background: var(--card-coral-solid); }
.tone-sky { background: var(--card-sky-solid); }
.tone-lilac { background: var(--card-lilac-solid); }
.tone-rose { background: var(--card-rose-solid); }
.tone-lagoon { background: var(--card-lagoon-solid); }
.tone-clay { background: var(--card-clay-solid); }
</style>
