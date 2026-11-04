<template>
  <div class="period-filter">
    <div class="chips" role="group" aria-label="Period">
      <DlChip v-for="p in PERIOD_PRESETS" :key="p.value" :selected="modelValue.preset === p.value" @click="pick(p.value)">{{ p.label }}</DlChip>
    </div>
    <div v-if="modelValue.preset === 'custom'" class="dates">
      <ion-input v-model="from" type="date" label="From" label-placement="stacked" fill="outline" />
      <ion-input v-model="to" type="date" :min="from || undefined" label="To" label-placement="stacked" fill="outline" />
      <ion-button class="dl-tonal" :disabled="!from || !to || to < from" @click="apply">Show</ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonInput } from '@ionic/vue'
import { ref, watch } from 'vue'
import { DlChip } from '@/components/dl'
import { PERIOD_PRESETS, type PeriodChoice, type PeriodPreset } from '@/lib/insights'

/** The period chips of the Insights screens. A preset applies at once; custom dates apply with "Show". */
const props = defineProps<{ modelValue: PeriodChoice }>()
const emit = defineEmits<{ 'update:modelValue': [PeriodChoice] }>()

const from = ref(props.modelValue.from)
const to = ref(props.modelValue.to)
watch(() => props.modelValue, (v) => {
  from.value = v.from
  to.value = v.to
})

/** Custom without dates shows the date fields; the screen keeps its figures until "Show". */
function pick(preset: PeriodPreset) {
  emit('update:modelValue', { preset, from: '', to: '' })
}

function apply() {
  emit('update:modelValue', { preset: 'custom', from: from.value, to: to.value })
}
</script>

<style scoped>
.period-filter {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
}
.dates {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  align-items: end;
  gap: 8px;
}
</style>
