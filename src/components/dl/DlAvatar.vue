<template>
  <img v-if="src" class="dl-avatar" :src="src" :alt="name" :style="box" />
  <span v-else class="dl-avatar initials" :class="`tone-${hue}`" :style="[box, { fontSize: `${Math.round(size * 0.38)}px` }]" role="img" :aria-label="name">
    {{ initials }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { PaletteTone } from './types'

const ORDER: PaletteTone[] = ['coral', 'sky', 'lilac', 'pine', 'clay', 'lagoon', 'rose', 'butter']

/** A round photo, or initials on a palette color that stays the same for the same name. */
const props = withDefaults(defineProps<{ name: string; size?: number; tone?: PaletteTone; src?: string | null }>(), {
  size: 40,
  tone: undefined,
  src: undefined,
})

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/)
  return (((parts[0] ?? '')[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '')).toUpperCase()
})
const hue = computed<PaletteTone>(() => {
  if (props.tone) return props.tone
  let h = 0
  for (let i = 0; i < props.name.length; i++) h = (h * 31 + props.name.charCodeAt(i)) >>> 0
  return ORDER[h % ORDER.length]
})
const box = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))
</script>

<style scoped>
.dl-avatar {
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
  overflow: hidden;
}
.initials {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
}
.tone-pine { background: var(--card-pine-tint); color: var(--card-pine-ink); }
.tone-butter { background: var(--card-butter-tint); color: var(--card-butter-ink); }
.tone-coral { background: var(--card-coral-tint); color: var(--card-coral-ink); }
.tone-sky { background: var(--card-sky-tint); color: var(--card-sky-ink); }
.tone-lilac { background: var(--card-lilac-tint); color: var(--card-lilac-ink); }
.tone-rose { background: var(--card-rose-tint); color: var(--card-rose-ink); }
.tone-lagoon { background: var(--card-lagoon-tint); color: var(--card-lagoon-ink); }
.tone-clay { background: var(--card-clay-tint); color: var(--card-clay-ink); }
</style>
