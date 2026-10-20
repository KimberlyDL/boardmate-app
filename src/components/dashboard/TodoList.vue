<template>
  <div>
    <h3>To do</h3>
    <p v-if="!items.length" class="muted">Nothing waiting. Nice.</p>
    <ion-list v-else inset>
      <ion-item v-for="t in items" :key="t.key" button :router-link="t.link" detail>
        <ion-label class="ion-text-wrap">
          <h3 :class="{ warn: t.urgent }">{{ t.text }}</h3>
          <p v-if="showWhere">{{ t.detail }}</p>
        </ion-label>
      </ion-item>
    </ion-list>
  </div>
</template>

<script setup lang="ts">
import { IonItem, IonLabel, IonList } from '@ionic/vue'
import type { TodoItem } from '@/lib/dashboardTodo'

/** What waits across the person's properties (A10). `showWhere`: name the property (more than one). */
defineProps<{ items: TodoItem[]; showWhere: boolean }>()
</script>

<style scoped>
.warn {
  color: var(--ion-color-danger);
}
</style>
