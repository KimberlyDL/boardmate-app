<template>
  <component
    :is="tappable ? 'button' : 'div'"
    :type="tappable ? 'button' : undefined"
    class="dl-card"
    :class="[`tone-${tone}`, { tappable }]"
    :style="{ padding: typeof padding === 'number' ? `${padding}px` : padding }"
    :data-dl-focus="tappable ? '' : undefined"
    @click="go"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import type { PaletteTone } from './types'
import { useTap } from './useTap'

/**
 * A flat card: separates from the canvas by tone, never by shadow or border.
 * surface (default) is the soft white gradient; muted is a stone tint; a palette
 * hue gives a tinted card with that hue's ink text.
 */
const props = withDefaults(
  defineProps<{
    tone?: 'surface' | 'muted' | 'ink' | PaletteTone
    padding?: number | string
    /** Route to open on tap. A plain @click also makes the card tappable. */
    to?: string
  }>(),
  { tone: 'surface', padding: 16, to: undefined },
)

const { tappable, go } = useTap(props)
</script>

<style scoped>
.dl-card {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--gradient-card);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
}
.tone-muted { background: var(--bg-muted); }
.tone-ink { background: var(--bg-ink); color: var(--text-on-ink); }
.tone-pine { background: var(--card-pine-gradient); color: var(--card-pine-ink); }
.tone-butter { background: var(--card-butter-gradient); color: var(--card-butter-ink); }
.tone-coral { background: var(--card-coral-gradient); color: var(--card-coral-ink); }
.tone-sky { background: var(--card-sky-gradient); color: var(--card-sky-ink); }
.tone-lilac { background: var(--card-lilac-gradient); color: var(--card-lilac-ink); }
.tone-rose { background: var(--card-rose-gradient); color: var(--card-rose-ink); }
.tone-lagoon { background: var(--card-lagoon-gradient); color: var(--card-lagoon-ink); }
.tone-clay { background: var(--card-clay-gradient); color: var(--card-clay-ink); }
.tappable {
  cursor: pointer;
  transition: transform var(--motion-fast) var(--ease-out), filter var(--motion-fast) var(--ease-out);
}
.tappable:active { transform: scale(0.98); filter: brightness(0.97); }
</style>
