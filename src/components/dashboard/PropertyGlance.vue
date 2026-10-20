<template>
  <ion-card button :router-link="`/properties/${d.property.id}`">
    <ion-card-header>
      <ion-card-subtitle>{{ occupancyText }}</ion-card-subtitle>
      <ion-card-title>{{ d.property.name }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p v-if="!d.occupancy.places" class="muted">No rooms yet. Add rooms and publish the listing to take bookings.</p>
      <div v-else class="figures">
        <div>
          <span class="label">Available</span>
          <strong>{{ d.occupancy.available }}</strong>
        </div>
        <div v-if="d.overdue">
          <span class="label">Overdue</span>
          <strong :class="{ warn: d.overdue.centavos > 0 }">{{ peso(d.overdue.centavos) }}</strong>
        </div>
        <div v-if="d.due_this_week">
          <span class="label">Due this week</span>
          <strong>{{ peso(d.due_this_week.centavos) }}</strong>
        </div>
        <div v-if="d.collected_this_month !== null">
          <span class="label">Collected this month</span>
          <strong>{{ peso(d.collected_this_month) }}</strong>
        </div>
      </div>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle } from '@ionic/vue'
import { computed } from 'vue'
import { peso } from '@/lib/money'
import type { PropertyDashboard } from '@/types/dashboard'

/** A property's key numbers on the home screen (A10). Tapping opens its full dashboard. */
const props = defineProps<{ d: PropertyDashboard }>()

const occupancyText = computed(() => {
  const o = props.d.occupancy
  return o.places ? `${o.occupied} of ${o.places} places taken${o.reserved ? ` · ${o.reserved} reserved` : ''}` : 'Not set up yet'
})
</script>

<style scoped>
.figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}
.figures div {
  display: flex;
  flex-direction: column;
}
.label {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
.warn {
  color: var(--ion-color-danger);
}
</style>
