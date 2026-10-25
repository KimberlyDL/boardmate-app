<template>
  <DlSection title="Needs your action">
    <DlCard v-if="!items.length">
      <DlEmptyState note="nothing waiting. nice!" :icon="CircleCheck">Requests, payments and applications that need you show up here.</DlEmptyState>
    </DlCard>
    <DlCard v-else padding="4px 16px">
      <DlListRow
        v-for="(t, i) in items"
        :key="t.key"
        :icon="t.urgent ? CircleAlert : ListChecks"
        :title="t.text"
        :subtitle="showWhere ? t.detail : undefined"
        :to="t.link"
        :divider="i > 0"
        :class="{ urgent: t.urgent }"
      />
    </DlCard>
  </DlSection>
</template>

<script setup lang="ts">
import { CircleAlert, CircleCheck, ListChecks } from 'lucide-vue-next'
import { DlCard, DlEmptyState, DlListRow, DlSection } from '@/components/dl'
import type { TodoItem } from '@/lib/dashboardTodo'

/** What waits across the person's properties (A10). `showWhere`: name the property (more than one). */
defineProps<{ items: TodoItem[]; showWhere: boolean }>()
</script>

<style scoped>
.urgent :deep(.dl-icon-tile) {
  background: var(--danger-subtle);
  color: var(--danger-text);
}
.urgent :deep(.title) {
  color: var(--danger-text);
}
</style>
