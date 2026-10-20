<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/stay" /></ion-buttons>
        <ion-title>Repairs</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <ion-button v-if="staying" expand="block" @click="reporting = true">Report a problem</ion-button>
        <p v-else-if="!loading" class="muted small">You can report a problem once you have moved in somewhere.</p>

        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="!items.length" class="muted center">No requests yet.</p>
        <ion-list v-else lines="full">
          <ion-item v-for="r in items" :key="r.id" button :detail="true" @click="openId = r.id">
            <ion-label class="ion-text-wrap">
              <h2>
                {{ r.category_label }}
                <ion-badge v-if="r.urgency === 'urgent' && isOpen(r)" color="danger">Urgent</ion-badge>
              </h2>
              <p>{{ r.description }}</p>
              <p class="small">{{ r.property.name }}<template v-if="r.created_at"> · {{ manilaDate(r.created_at).format('MMM D, YYYY') }}</template></p>
            </ion-label>
            <ion-badge slot="end" :color="r.status === 'resolved' ? 'warning' : isOpen(r) ? 'primary' : 'medium'">
              {{ r.status === 'resolved' ? 'Fixed? Confirm' : r.status_label }}
            </ion-badge>
          </ion-item>
        </ion-list>
      </div>

      <report-sheet :open="reporting" @close="reporting = false" @done="reported" />
      <request-sheet :request-id="openId" @close="openId = null" @changed="load" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { ref } from 'vue'
import ReportSheet from '@/components/maintenance/ReportSheet.vue'
import RequestSheet from '@/components/maintenance/RequestSheet.vue'
import { manilaDate } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { maintenanceService } from '@/services/maintenance'
import { tenancyService } from '@/services/tenancies'
import { useToast } from '@/composables/useToast'
import type { MaintenanceRequest } from '@/types/maintenance'

/** A boarder's maintenance requests (D1): report a problem, follow it, confirm the fix. */
const toast = useToast()
const items = ref<MaintenanceRequest[]>([])
const staying = ref(false)
const loading = ref(true)
const reporting = ref(false)
const openId = ref<number | null>(null)

const isOpen = (r: MaintenanceRequest) => r.status === 'submitted' || r.status === 'in_progress'

async function load() {
  try {
    const [mine, stays] = await Promise.all([maintenanceService.mine(), tenancyService.mine()])
    items.value = mine
    staying.value = stays.length > 0
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}

async function reported(message: string) {
  reporting.value = false
  toast.success(message)
  await load()
}
</script>

<style scoped>
.small {
  font-size: 0.85rem;
}
</style>
