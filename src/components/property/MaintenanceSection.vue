<template>
  <div>
    <ion-segment :value="filter" @ion-change="setFilter(String($event.detail.value))">
      <ion-segment-button value="open"><ion-label>Open</ion-label></ion-segment-button>
      <ion-segment-button value="resolved"><ion-label>Fixed</ion-label></ion-segment-button>
      <ion-segment-button value="done"><ion-label>Closed</ion-label></ion-segment-button>
    </ion-segment>

    <ion-button size="small" fill="outline" class="gap" @click="logging = true">Log a request</ion-button>
    <p v-if="filter === 'resolved'" class="muted small">Waiting for the boarder to confirm. They close by themselves 3 days after the fix.</p>

    <p v-if="loading" class="muted">Loading…</p>
    <p v-else-if="!items.length" class="muted center">{{ filter === 'open' ? 'No open requests.' : 'Nothing here.' }}</p>
    <ion-list v-else lines="full">
      <ion-item v-for="r in items" :key="r.id" button :detail="true" @click="openId = r.id">
        <ion-label class="ion-text-wrap">
          <h2>
            {{ r.category_label }} · {{ r.room ? `Room ${r.room.label}` : 'Whole place' }}
            <ion-badge v-if="r.urgency === 'urgent' && filter === 'open'" color="danger">Urgent</ion-badge>
          </h2>
          <p>{{ r.description }}</p>
          <p class="small">
            {{ r.reported_by.name }}<template v-if="r.created_at"> · {{ manilaDate(r.created_at).format('MMM D, YYYY') }}</template>
            <template v-if="r.assignee"> · assigned to {{ r.assignee.name }}</template>
            <template v-if="r.photos_count"> · {{ r.photos_count }} photo{{ r.photos_count === 1 ? '' : 's' }}</template>
          </p>
        </ion-label>
        <ion-badge slot="end" :color="r.status === 'submitted' ? 'warning' : 'medium'">{{ r.status_label }}</ion-badge>
      </ion-item>
    </ion-list>

    <report-sheet :open="logging" :property-id="property.id" :rooms="property.rooms.map((r) => ({ id: r.id, label: r.label }))" @close="logging = false" @done="logged" />
    <request-sheet :request-id="openId" :assignees="assignees" @close="openId = null" @changed="load" />
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonItem, IonLabel, IonList, IonSegment, IonSegmentButton } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import ReportSheet from '@/components/maintenance/ReportSheet.vue'
import RequestSheet from '@/components/maintenance/RequestSheet.vue'
import { manilaDate } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { maintenanceService } from '@/services/maintenance'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { MaintenanceRequest } from '@/types/maintenance'
import type { Property } from '@/types/property'

type Filter = 'open' | 'resolved' | 'done'

/** A property's maintenance requests (D1) for the owner and caretakers: urgent open ones first. */
const props = defineProps<{ property: Property }>()

const toast = useToast()
const auth = useAuthStore()
const items = ref<MaintenanceRequest[]>([])
const filter = ref<Filter>('open')
const loading = ref(true)
const logging = ref(false)
const openId = ref<number | null>(null)

/** The owner can assign to themself or a caretaker; a caretaker only to themself. */
const assignees = computed(() => {
  const me = auth.user ? [{ id: auth.user.id, name: `${auth.user.name} (me)` }] : []
  const caretakers = (props.property.caretakers ?? []).map((c) => ({ id: c.caretaker_id, name: c.name }))
  return [...me, ...caretakers]
})

async function load() {
  try {
    items.value = await maintenanceService.forProperty(props.property.id, filter.value)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onMounted(load)

function setFilter(next: string) {
  filter.value = next as Filter
  loading.value = true
  load()
}

async function logged(message: string) {
  logging.value = false
  toast.success(message)
  await load()
}
</script>

<style scoped>
.gap {
  margin-top: 12px;
}
.small {
  font-size: 0.85rem;
}
</style>
