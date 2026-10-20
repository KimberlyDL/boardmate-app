<template>
  <div v-if="d" class="dash">
    <div class="tiles">
      <div class="tile">
        <span class="label">Places taken</span>
        <strong>{{ d.occupancy.occupied }} / {{ d.occupancy.places }}</strong>
        <span class="small">{{ d.occupancy.available }} available<template v-if="d.occupancy.reserved"> · {{ d.occupancy.reserved }} reserved</template><template v-if="d.occupancy.not_ready"> · {{ d.occupancy.not_ready }} not ready</template></span>
      </div>
      <div v-if="d.overdue" class="tile" role="button" @click="emit('open', 'billing')">
        <span class="label">Overdue</span>
        <strong :class="{ warn: d.overdue.centavos > 0 }">{{ peso(d.overdue.centavos) }}</strong>
        <span class="small">{{ d.overdue.payers }} boarder{{ d.overdue.payers === 1 ? '' : 's' }}</span>
      </div>
      <div v-if="d.due_this_week" class="tile">
        <span class="label">Due this week</span>
        <strong>{{ peso(d.due_this_week.centavos) }}</strong>
        <span class="small">{{ d.due_this_week.bills }} bill{{ d.due_this_week.bills === 1 ? '' : 's' }}</span>
      </div>
      <div v-if="d.collected_this_month !== null" class="tile">
        <span class="label">Collected this month</span>
        <strong>{{ peso(d.collected_this_month) }}</strong>
      </div>
    </div>

    <ion-list v-if="waiting.length" inset>
      <ion-item v-for="w in waiting" :key="w.tab + w.text" button detail @click="emit('open', w.tab)">
        <ion-label :class="{ warn: w.urgent }">{{ w.text }}</ion-label>
      </ion-item>
    </ion-list>

    <template v-if="d.unpaid_shared_bills?.length">
      <h3>Rooms with unpaid shared bills</h3>
      <ion-list lines="full">
        <ion-item v-for="r in d.unpaid_shared_bills" :key="r.room.id">
          <ion-label class="ion-text-wrap">
            <h2>Room {{ r.room.label }}</h2>
            <p>Billed to {{ r.billed_to ?? '—' }}</p>
          </ion-label>
          <ion-note slot="end" :class="{ warn: r.overdue }">{{ peso(r.centavos) }}<template v-if="r.overdue"> · overdue</template></ion-note>
        </ion-item>
      </ion-list>
    </template>

    <p v-if="!d.occupancy.places" class="muted">No rooms yet. Add rooms in the Rooms tab, set prices, then publish the listing.</p>
  </div>
</template>

<script setup lang="ts">
import { IonItem, IonLabel, IonList, IonNote } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import { peso } from '@/lib/money'
import { dashboardService } from '@/services/dashboard'
import type { PropertyDashboard } from '@/types/dashboard'

/** A property's full dashboard (A10) on its Overview tab. `open`: switch to the tab where the work is. */
const props = defineProps<{ propertyId: number }>()
const emit = defineEmits<{ open: [tab: string] }>()

const d = ref<PropertyDashboard | null>(null)

onMounted(async () => {
  try {
    d.value = await dashboardService.property(props.propertyId)
  } catch {
    // The rest of the Overview still works without it.
  }
})

const waiting = computed(() => {
  const v = d.value
  if (!v) return []
  const rows: { text: string; tab: string; urgent?: boolean }[] = []
  if (v.repairs?.urgent) rows.push({ text: `${v.repairs.urgent} urgent repair${v.repairs.urgent === 1 ? '' : 's'}`, tab: 'maintenance', urgent: true })
  if (v.proofs_waiting) rows.push({ text: `${v.proofs_waiting} payment${v.proofs_waiting === 1 ? '' : 's'} to confirm`, tab: 'billing' })
  const decide = (v.house_operations?.late_entries_waiting ?? 0) + (v.house_operations?.overnight_waiting ?? 0)
  if (decide) rows.push({ text: `${decide} curfew or visitor request${decide === 1 ? '' : 's'} to decide`, tab: 'houseops' })
  if (v.house_operations?.visitors_today) rows.push({ text: `${v.house_operations.visitors_today} visitor${v.house_operations.visitors_today === 1 ? '' : 's'} today`, tab: 'houseops' })
  const open = (v.repairs?.open ?? 0) - (v.repairs?.urgent ?? 0)
  if (open > 0) rows.push({ text: `${open} open repair${open === 1 ? '' : 's'}`, tab: 'maintenance' })
  return rows
})
</script>

<style scoped>
.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}
.tile {
  display: flex;
  flex-direction: column;
  padding: 12px;
  border-radius: 8px;
  background: var(--ion-color-light);
}
.tile[role='button'] {
  cursor: pointer;
}
.label,
.small {
  font-size: 0.8rem;
  color: var(--ion-color-medium);
}
strong {
  font-size: 1.2rem;
}
.warn {
  color: var(--ion-color-danger);
}
</style>
