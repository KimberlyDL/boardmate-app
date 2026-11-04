<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/insights" /></ion-buttons>
        <ion-title>{{ data?.property.name ?? 'Property' }}</ion-title>
        <ion-buttons v-if="data" slot="end">
          <ion-button :disabled="busy" @click="pdf"><FileDown slot="start" :size="18" class="btn-icon" />PDF</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="insights">
        <PeriodFilter v-model="period" />

        <template v-if="!data">
          <DlSkeleton :height="96" :radius="18" />
          <DlSkeleton :height="260" :radius="18" />
        </template>

        <template v-else>
          <p class="dl-eyebrow period">{{ data.property.name }} · {{ periodText(data.period) }}</p>

          <FinanceOverview :totals="data.totals" :previous="data.previous" :series="data.series" :period="data.period" />

          <DlSection title="By room" :meta="`${data.rooms.length}`">
            <DlCard padding="4px 16px">
              <DlListRow
                v-for="(r, i) in data.rooms"
                :key="r.room?.id ?? 'removed'"
                :title="r.room ? r.room.label : 'Rooms since removed'"
                :subtitle="roomLine(r)"
                :trailing="r.room ? `${r.occupancy.occupied}/${r.occupancy.places}` : null"
                :chevron="!!r.room"
                :divider="i > 0"
                @click="r.room && openRoom(r.room.id)"
              />
            </DlCard>
          </DlSection>

          <p class="muted note">
            Money counts in the room where it was applied to a bill. Payments not yet applied to a bill
            show as "Paid, not yet on a bill" above.
          </p>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue'
import { FileDown } from 'lucide-vue-next'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FinanceOverview from '@/components/insights/FinanceOverview.vue'
import PeriodFilter from '@/components/insights/PeriodFilter.vue'
import { DlCard, DlListRow, DlRefresher, DlSection, DlSkeleton } from '@/components/dl'
import { useToast } from '@/composables/useToast'
import { openDocument } from '@/lib/documents'
import { percent, periodDates, periodFromQuery, periodText, periodToQuery, type PeriodChoice } from '@/lib/insights'
import { pesoShort } from '@/lib/money'
import { firstError } from '@/services/api'
import { financeService } from '@/services/finance'
import type { FinanceFigures, PropertyFinance } from '@/types/finance'

/** Insights for one property (A11): its figures, then each room's, which open the room's stays. */
const toast = useToast()
const route = useRoute()
const router = useRouter()
const data = ref<PropertyFinance | null>(null)
const period = ref<PeriodChoice>(periodFromQuery(route.query))
const busy = ref(false)

const propertyId = () => Number(route.params.id)

async function load() {
  const dates = periodDates(period.value)
  if (period.value.preset === 'custom' && !dates) return
  try {
    data.value = await financeService.property(propertyId(), dates ?? {})
  } catch (e) {
    toast.error(firstError(e))
  }
}

watch(period, () => {
  router.replace({ query: periodToQuery(period.value) })
  load()
})

const roomLine = (r: FinanceFigures) =>
  `Collected ${pesoShort(r.collected.total)} · ${percent(r.collection.rate)} paid · ${r.outstanding.overdue ? pesoShort(r.outstanding.overdue) + ' overdue' : 'nothing overdue'}`

function openRoom(id: number) {
  router.push({ path: `/insights/rooms/${id}`, query: periodToQuery(period.value) })
}

async function pdf() {
  busy.value = true
  try {
    await openDocument(() => financeService.propertyPdf(propertyId(), periodDates(period.value) ?? {}))
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

onIonViewWillEnter(load)
</script>

<style scoped>
.btn-icon {
  margin-right: 4px;
}
.insights {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 960px;
  margin: 0 auto;
}
.period {
  margin: 0;
}
.note {
  margin: 0 0 24px;
}
</style>
