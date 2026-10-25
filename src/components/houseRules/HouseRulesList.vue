<template>
  <div class="house-rules">
    <template v-for="group in groups" :key="group.category">
      <p class="category">{{ group.label }}</p>
      <ul>
        <li v-for="(body, i) in group.bodies" :key="i">{{ body }}</li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { HouseRule } from '@/types/houseRules'

/** House rules grouped by category, in the order the owner wrote them. */
const props = defineProps<{ rules: HouseRule[] }>()

const groups = computed(() => {
  const byCategory = new Map<string, { category: string; label: string; bodies: string[] }>()
  for (const r of props.rules) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, { category: r.category, label: r.category_label, bodies: [] })
    byCategory.get(r.category)!.bodies.push(r.body)
  }
  return [...byCategory.values()]
})
</script>

<style scoped>
.house-rules {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.category {
  margin: 12px 0 2px;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.category:first-child {
  margin-top: 0;
}
ul {
  margin: 0;
  padding-left: 18px;
}
li {
  margin: 4px 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-primary);
}
li::marker {
  color: var(--brand-primary);
}
</style>
