<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/insights" /></ion-buttons>
        <ion-title>{{ data?.room.label ?? 'Room' }}</ion-title>
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
          <p class="dl-eyebrow period">{{ data.property.name }} · {{ data.room.label }} · {{ periodText(data.period) }}</p>

          <FinanceOverview :totals="data.totals" :previous="data.previous" :series="data.series" :period="data.period" />

          <DlSection title="Stays in this period">
            <DlCard v-if="!data.stays.length">
              <p class="empty">Nobody stayed in this room during the period.</p>
            </DlCard>
            <DlCard v-else padding="4px 16px">
              <DlListRow
                v-for="(s, i) in data.stays"
                :key="s.stay.id"
                :title="s.stay.tenant.name ?? 'Former boarder'"
                :subtitle="stayLine(s)"
                :trailing="s.balance ? pesoShort(s.balance) : null"
                :divider="i > 0"
                @click="openStay(s.stay.id)"
              >
                <template #leading><DlAvatar :name="s.stay.tenant.name ?? '?'" /></template>
              </DlListRow>
            </DlCard>
            <p class="muted">Each stay's amounts are from move-in to today. The amount on the right is still unpaid.</p>
          </DlSection>
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
import { DlAvatar, DlCard, DlListRow, DlRefresher, DlSection, DlSkeleton } from '@/components/dl'
import { useToast } from '@/composables/useToast'
import { manilaDate } from '@/lib/dayjs'
import { openDocument } from '@/lib/documents'
import { periodDates, periodFromQuery, periodText, periodToQuery, type PeriodChoice } from '@/lib/insights'
import { pesoShort } from '@/lib/money'
import { firstError } from '@/services/api'
import { financeService } from '@/services/finance'
import type { RoomFinance } from '@/types/finance'

/** Insights for one room (A11): its figures, then each stay in it during the period, which opens the stay. */
const toast = useToast()
const route = useRoute()
const router = useRouter()
const data = ref<RoomFinance | null>(null)
const period = ref<PeriodChoice>(periodFromQuery(route.query))
const busy = ref(false)

const roomId = () => Number(route.params.id)

async function load() {
  const dates = periodDates(period.value)
  if (period.value.preset === 'custom' && !dates) return
  try {
    data.value = await financeService.room(roomId(), dates ?? {})
  } catch (e) {
    toast.error(firstError(e))
  }
}

watch(period, () => {
  router.replace({ query: periodToQuery(period.value) })
  load()
})

const day = (d: string | null) => (d ? manilaDate(d).format('D MMM YYYY') : '')

/** "Bed 2 · 1 Sep 2026 – today · paid ₱4k of ₱5.1k" */
function stayLine(s: RoomFinance['stays'][number]): string {
  const dates = `${day(s.stay.moved_in_on)} – ${s.stay.moved_out_on ? day(s.stay.moved_out_on) : 'today'}`
  return [s.stay.unit?.label, dates, `paid ${pesoShort(s.paid)} of ${pesoShort(s.billed)}`].filter(Boolean).join(' · ')
}

function openStay(id: number) {
  router.push(`/insights/stays/${id}`)
}

async function pdf() {
  busy.value = true
  try {
    await openDocument(() => financeService.roomPdf(roomId(), periodDates(period.value) ?? {}))
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
  margin: 0 auto 24px;
}
.period {
  margin: 0;
}
.empty {
  margin: 16px 0;
  color: var(--text-muted);
  text-align: center;
}
</style>
