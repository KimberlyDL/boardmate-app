<template>
  <span class="dl-status-tag" :class="[`tone-${resolvedTone}`, { solid }]"><slot>{{ presetLabel }}</slot></span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'

const PRESETS: Record<string, [Tone, string]> = {
  paid: ['success', 'Paid'],
  done: ['success', 'Done'],
  approved: ['success', 'Approved'],
  pending: ['warning', 'Pending'],
  due: ['warning', 'Due soon'],
  overdue: ['danger', 'Overdue'],
  full: ['danger', 'Full'],
  rejected: ['danger', 'Rejected'],
  new: ['info', 'New'],
  verified: ['brand', 'Verified'],
}

/**
 * A mono uppercase status label. Always pair a status color with its word.
 * Pick a preset `status`, or set `tone` and the text yourself.
 */
const props = defineProps<{
  status?: string
  tone?: Tone
  /** Solid fill (badges on photos); default is the subtle tint. */
  solid?: boolean
}>()

const preset = computed(() => (props.status ? PRESETS[props.status] : undefined))
const resolvedTone = computed<Tone>(() => props.tone ?? preset.value?.[0] ?? 'neutral')
const presetLabel = computed(() => preset.value?.[1] ?? props.status ?? '')
</script>

<style scoped>
.dl-status-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 500;
  line-height: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}
.tone-success { background: var(--success-subtle); color: var(--success-text); }
.tone-warning { background: var(--warning-subtle); color: var(--warning-text); }
.tone-danger { background: var(--danger-subtle); color: var(--danger-text); }
.tone-info { background: var(--info-subtle); color: var(--info-text); }
.tone-brand { background: var(--brand-primary-subtle); color: var(--brand-primary-hover); }
.tone-neutral { background: var(--bg-muted); color: var(--text-secondary); }
.solid { color: #ffffff; }
.solid.tone-success { background: var(--success-solid); }
.solid.tone-warning { background: var(--warning-solid); }
.solid.tone-danger { background: var(--danger-solid); }
.solid.tone-info { background: var(--info-solid); }
.solid.tone-brand { background: var(--brand-primary); color: var(--text-on-primary); }
.solid.tone-neutral { background: var(--stone-700); }
/* Dark theme's solids are light: dark text keeps them readable. */
:root.ion-palette-dark .solid:not(.tone-neutral) { color: var(--text-on-primary); }
</style>
