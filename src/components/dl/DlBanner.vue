<template>
  <div class="dl-banner" :class="`tone-${tone}`" :role="tone === 'danger' ? 'alert' : 'status'">
    <component :is="icon ?? ICONS[tone]" class="icon" :size="18" aria-hidden="true" />
    <div class="text">
      <div v-if="title" class="title">{{ title }}</div>
      <div v-if="$slots.default" class="body" :class="{ lead: !title }"><slot /></div>
    </div>
    <button v-if="actionLabel" type="button" class="action" data-dl-focus @click="onAction">{{ actionLabel }}</button>
  </div>
</template>

<script setup lang="ts">
import { CircleAlert, CircleCheck, Clock, Info } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { IconComponent, StatusTone } from './types'

const ICONS: Record<StatusTone, IconComponent> = { success: CircleCheck, warning: Clock, danger: CircleAlert, info: Info }

/** A tinted notice at the top of a screen, with an optional text action (`to` route or @action). */
const props = withDefaults(
  defineProps<{
    tone?: StatusTone
    title?: string
    icon?: IconComponent
    actionLabel?: string
    to?: string
  }>(),
  { tone: 'info', title: undefined, icon: undefined, actionLabel: undefined, to: undefined },
)
const emit = defineEmits<{ action: [] }>()
const router = useRouter()

function onAction() {
  if (props.to) router?.push(props.to)
  else emit('action')
}
</script>

<style scoped>
.dl-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.45;
}
.icon { flex-shrink: 0; margin-top: 1px; }
.text { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 0; }
.title { font-weight: 700; }
.body.lead { font-weight: 500; }
.action {
  flex-shrink: 0;
  min-height: 24px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
}
.tone-success { background: var(--success-subtle); color: var(--success-text); }
.tone-warning { background: var(--warning-subtle); color: var(--warning-text); }
.tone-danger { background: var(--danger-subtle); color: var(--danger-text); }
.tone-info { background: var(--info-subtle); color: var(--info-text); }
</style>
