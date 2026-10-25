<template>
  <div class="dl-empty-state">
    <span v-if="icon" class="art" aria-hidden="true"><component :is="icon" :size="36" :stroke-width="1.75" /></span>
    <p v-if="note" class="note">{{ note }}</p>
    <p v-if="$slots.default" class="body"><slot /></p>
    <ion-button v-if="actionLabel" class="dl-tonal" :router-link="to" @click="!to && emit('action')">{{ actionLabel }}</ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonButton } from '@ionic/vue'
import type { IconComponent } from './types'

/**
 * Nothing to show yet: an icon, a Caveat note (lowercase, five words max),
 * one helpful sentence, and an optional action.
 */
withDefaults(defineProps<{ note?: string; icon?: IconComponent; actionLabel?: string; to?: string }>(), {
  note: undefined,
  icon: undefined,
  actionLabel: undefined,
  to: undefined,
})
const emit = defineEmits<{ action: [] }>()
</script>

<style scoped>
.dl-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 28px 24px;
  text-align: center;
}
.art {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  margin-bottom: 4px;
  border-radius: 24px;
  background: var(--brand-primary-subtle);
  color: var(--brand-primary);
}
.note {
  margin: 0;
  font-family: var(--font-decorative);
  font-size: 26px;
  font-weight: 700;
  line-height: 1.1;
  color: var(--brand-primary);
}
.body {
  max-width: 280px;
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-secondary);
}
</style>
