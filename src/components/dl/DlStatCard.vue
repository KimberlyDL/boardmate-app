<template>
  <component
    :is="tappable ? 'button' : 'div'"
    :type="tappable ? 'button' : undefined"
    class="dl-stat-card"
    :class="dark ? 'dark' : `tone-${tone}`"
    :data-dl-focus="tappable ? '' : undefined"
    @click="go"
  >
    <span class="label">{{ label }}</span>
    <span class="value"><slot>{{ value }}</slot></span>
    <span v-if="caption" class="caption">{{ caption }}</span>
  </component>
</template>

<script setup lang="ts">
import type { PaletteTone } from './types'
import { useTap } from './useTap'

/** A big number on a tinted card. `dark` (ink) is for the single most important number. */
const props = withDefaults(
  defineProps<{
    label: string
    value?: string | number
    caption?: string
    tone?: PaletteTone
    dark?: boolean
    to?: string
  }>(),
  { value: undefined, caption: undefined, tone: 'pine', to: undefined },
)

const { tappable, go } = useTap(props)
</script>

<style scoped>
.dl-stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 18px;
  box-sizing: border-box;
  border: 0;
  border-radius: var(--radius-lg);
  font: inherit;
  text-align: left;
}
button.dl-stat-card { cursor: pointer; }
button.dl-stat-card:active { transform: scale(0.98); }
.label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.value {
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.1;
  overflow-wrap: anywhere;
}
.caption { font-size: 13px; line-height: 18px; }
.dark { background: var(--bg-ink); color: var(--text-on-ink); }
.dark .label { opacity: 0.8; }
.dark .caption { opacity: 0.85; }
.tone-pine { background: var(--card-pine-gradient); color: var(--card-pine-ink); }
.tone-butter { background: var(--card-butter-gradient); color: var(--card-butter-ink); }
.tone-coral { background: var(--card-coral-gradient); color: var(--card-coral-ink); }
.tone-sky { background: var(--card-sky-gradient); color: var(--card-sky-ink); }
.tone-lilac { background: var(--card-lilac-gradient); color: var(--card-lilac-ink); }
.tone-rose { background: var(--card-rose-gradient); color: var(--card-rose-ink); }
.tone-lagoon { background: var(--card-lagoon-gradient); color: var(--card-lagoon-ink); }
.tone-clay { background: var(--card-clay-gradient); color: var(--card-clay-ink); }
</style>
