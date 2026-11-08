<template>
  <div class="formats" role="radiogroup" :aria-label="label">
    <button
      v-for="f in TABLE_FORMATS"
      :key="f.value"
      type="button"
      role="radio"
      class="format"
      :class="{ on: modelValue === f.value }"
      :aria-checked="modelValue === f.value"
      data-dl-focus
      @click="emit('update:modelValue', f.value)"
    >
      <component :is="ICONS[f.value]" :size="20" aria-hidden="true" />
      <span class="name">{{ f.label }}</span>
      <span class="hint">{{ f.hint }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { FileSpreadsheet, FileText, FileType2 } from 'lucide-vue-next'
import { TABLE_FORMATS, type TableFormat } from '@/services/reports'

/** Excel, PDF or CSV, as three cards side by side (one column on a narrow phone). */
withDefaults(defineProps<{ modelValue: TableFormat; label?: string }>(), { label: 'File type' })
const emit = defineEmits<{ 'update:modelValue': [format: TableFormat] }>()

const ICONS = { xlsx: FileSpreadsheet, pdf: FileText, csv: FileType2 }
</script>

<style scoped>
.formats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin: 12px 0;
}
.format {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1.5px solid var(--bm-border, rgb(0 0 0 / 0.12));
  border-radius: var(--radius-md, 12px);
  background: var(--bg-surface, #fff);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.format.on {
  border-color: var(--brand-primary);
  background: var(--brand-primary-subtle, rgb(15 118 110 / 0.08));
}
.format.on :deep(svg) {
  color: var(--brand-primary);
}
.name {
  margin-top: 4px;
  font-weight: 700;
}
.hint {
  font-size: 12px;
  line-height: 15px;
  color: var(--text-muted);
}
@media (max-width: 380px) {
  .formats {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
