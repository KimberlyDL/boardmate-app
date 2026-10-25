<template>
  <DlCard :to="`/properties/${d.property.id}`" class="glance">
    <div class="head">
      <DlIconTile :icon="Building2" />
      <span class="who">
        <span class="dl-title">{{ d.property.name }}</span>
        <span class="dl-data upper">{{ occupancyText }}</span>
      </span>
      <ChevronRight :size="18" class="chev" aria-hidden="true" />
    </div>
    <p v-if="!d.occupancy.places" class="dl-small empty">No rooms yet. Add rooms and publish the listing to take bookings.</p>
    <div v-else class="figures">
      <div>
        <span class="dl-eyebrow">Available</span>
        <strong>{{ d.occupancy.available }}</strong>
      </div>
      <div v-if="d.overdue">
        <span class="dl-eyebrow">Overdue</span>
        <strong :class="{ warn: d.overdue.centavos > 0 }">{{ peso(d.overdue.centavos) }}</strong>
      </div>
      <div v-if="d.due_this_week">
        <span class="dl-eyebrow">Due this week</span>
        <strong>{{ peso(d.due_this_week.centavos) }}</strong>
      </div>
      <div v-if="d.collected_this_month !== null">
        <span class="dl-eyebrow">Collected this month</span>
        <strong>{{ peso(d.collected_this_month) }}</strong>
      </div>
    </div>
  </DlCard>
</template>

<script setup lang="ts">
import { Building2, ChevronRight } from 'lucide-vue-next'
import { computed } from 'vue'
import { DlCard, DlIconTile } from '@/components/dl'
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
.glance {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.head {
  display: flex;
  align-items: center;
  gap: 12px;
}
.who {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.upper {
  text-transform: uppercase;
  color: var(--text-muted);
}
.chev {
  color: var(--text-muted);
}
.empty {
  margin: 0;
}
.figures {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.figures div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.figures strong {
  font-family: var(--font-display);
  font-size: 18px;
}
.warn {
  color: var(--danger-text);
}
</style>
