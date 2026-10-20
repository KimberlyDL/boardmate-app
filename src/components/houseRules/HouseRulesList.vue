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
.category {
  margin: 12px 0 4px;
  font-weight: 500;
}
ul {
  margin: 0;
  padding-left: 20px;
}
li {
  margin: 2px 0;
}
</style>
