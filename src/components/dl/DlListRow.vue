<template>
  <component
    :is="tappable ? 'button' : 'div'"
    :type="tappable ? 'button' : undefined"
    class="dl-list-row"
    :class="{ divider, tappable }"
    :data-dl-focus="tappable ? '' : undefined"
    @click="go"
  >
    <slot name="leading">
      <DlIconTile v-if="icon" :icon="icon" />
    </slot>
    <span class="text">
      <span class="title"><slot name="title">{{ title }}</slot></span>
      <span v-if="subtitle || $slots.subtitle" class="subtitle" :class="{ mono }"><slot name="subtitle">{{ subtitle }}</slot></span>
    </span>
    <slot name="trailing">
      <span v-if="trailing !== undefined && trailing !== null && trailing !== ''" class="trailing">{{ trailing }}</span>
    </slot>
    <ChevronRight v-if="chevron ?? tappable" class="chevron" :size="18" aria-hidden="true" />
  </component>
</template>

<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'
import DlIconTile from './DlIconTile.vue'
import type { IconComponent } from './types'
import { useTap } from './useTap'

/** One row in a card list: optional icon tile, title + subtitle, trailing value, chevron. */
const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /** Subtitle in JetBrains Mono (codes, dates, room labels). */
    mono?: boolean
    icon?: IconComponent
    trailing?: string | number | null
    /** Defaults to on when the row is tappable. */
    chevron?: boolean
    /** Hairline above: use on every row after the first. */
    divider?: boolean
    to?: string
  }>(),
  { title: undefined, subtitle: undefined, icon: undefined, trailing: undefined, chevron: undefined, to: undefined },
)

const { tappable, go } = useTap(props)
</script>

<style scoped>
.dl-list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 52px;
  padding: 12px 0;
  box-sizing: border-box;
  border: 0;
  background: none;
  color: var(--text-primary);
  font: inherit;
  text-align: left;
}
.divider { border-top: 1px solid var(--border-default); }
.tappable { cursor: pointer; }
.tappable:active { opacity: 0.7; }
.text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.title {
  font-size: 15px;
  font-weight: 700;
  line-height: 20px;
}
.subtitle {
  font-size: 12px;
  line-height: 16px;
  color: var(--text-muted);
}
.subtitle.mono {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}
.trailing {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}
.chevron {
  flex-shrink: 0;
  color: var(--text-muted);
}
</style>
