<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/stay" /></ion-buttons>
        <ion-title>Repairs</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow">
        <ion-button v-if="staying" expand="block" class="report" @click="reporting = true">
          <Wrench slot="start" :size="18" aria-hidden="true" /> Report a problem
        </ion-button>
        <DlBanner v-else-if="!loading" tone="info" class="report">You can report a problem once you have moved in somewhere.</DlBanner>

        <DlSkeleton v-if="loading" :height="160" :radius="18" />
        <DlCard v-else-if="!items.length">
          <DlEmptyState note="all good here" :icon="Wrench">No requests yet. Report a problem and follow it here.</DlEmptyState>
        </DlCard>
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
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Wrench } from 'lucide-vue-next'
import { ref } from 'vue'
import ReportSheet from '@/components/maintenance/ReportSheet.vue'
import RequestSheet from '@/components/maintenance/RequestSheet.vue'
import { DlBanner, DlCard, DlEmptyState, DlRefresher, DlSkeleton } from '@/components/dl'
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


async function reported(message: string) {
  reporting.value = false
  toast.success(message)
  await load()
}
</script>

<style scoped>
.report {
  margin: 0 0 var(--card-gap);
}
.small {
  font-size: 0.85rem;
}
</style>
