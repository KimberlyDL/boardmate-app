<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/boarder/bills" /></ion-buttons>
        <ion-title>My spending</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="spending">
        <template v-if="!data">
          <div class="tiles">
            <DlSkeleton v-for="i in 4" :key="i" :height="96" :radius="18" />
          </div>
          <DlSkeleton :height="240" :radius="18" />
        </template>

        <DlCard v-else-if="empty">
          <DlEmptyState note="nothing yet" :icon="Wallet">Your spending shows here once you move in somewhere and get bills.</DlEmptyState>
        </DlCard>

        <template v-else>
          <p class="dl-eyebrow period">Last 12 months · {{ day(data.period.from) }} – {{ day(data.period.to) }}</p>

          <div class="tiles">
            <DlStatCard label="You paid" :value="pesoShort(t.paid)" caption="To the owner, first rent included" dark />
            <DlStatCard label="You were billed" :value="pesoShort(t.billed)" caption="Rent, utilities and charges" />
            <DlStatCard label="Room group" :value="pesoShort(t.group)" caption="Your share of shared costs" tone="lilac" />
            <DlStatCard label="Deposit held" :value="pesoShort(data.deposits.held)" :caption="depositCaption" tone="butter" />
          </div>

          <div class="grid">
            <DlCard class="wide-card">
              <h2 class="dl-title">Each month</h2>
              <p class="muted">What you were billed, plus your share of the room group's costs</p>
              <DlChart
                kind="bar"
                format="money"
                stacked
                label="What you were billed each month, by kind, with your room group share"
                :labels="data.months.map((m, i) => monthLabel(m.month, i))"
                :series="[
                  { label: 'Rent', data: data.months.map((m) => m.rent), tone: 'pine' },
                  { label: 'Utilities', data: data.months.map((m) => m.utilities), tone: 'sky' },
                  { label: 'Other charges', data: data.months.map((m) => m.other), tone: 'coral' },
                  { label: 'Room group', data: data.months.map((m) => m.group), tone: 'lilac' },
                ]"
                :height="240"
              />
            </DlCard>

            <DlCard>
              <h2 class="dl-title">Where it went</h2>
              <p class="muted">{{ peso(t.billed + t.group) }} in 12 months</p>
              <DlChart
                v-if="slices.length"
                kind="doughnut"
                format="money"
                label="Where your money went in the last 12 months"
                :labels="slices.map((s) => s.label)"
                :series="[{ label: 'Spent', data: slices.map((s) => s.centavos), tones: slices.map((s) => s.tone) }]"
                :height="200"
              />
            </DlCard>

            <DlCard>
              <h2 class="dl-title">Paid each month</h2>
              <p class="muted">Payments the owner confirmed</p>
              <DlChart
                kind="bar"
                format="money"
                label="What you paid the owner each month"
                :labels="data.months.map((m, i) => monthLabel(m.month, i))"
                :series="[{ label: 'Paid', data: data.months.map((m) => m.paid), tone: 'pine' }]"
                :height="200"
              />
            </DlCard>

            <DlCard>
              <h2 class="dl-title">Deposits</h2>
              <dl class="figures">
                <div><dt>Paid at move-in</dt><dd>{{ peso(data.deposits.paid) }}</dd></div>
                <div><dt>Still held by the owner</dt><dd>{{ peso(data.deposits.held) }}</dd></div>
                <div><dt>Refunded to you</dt><dd>{{ peso(data.deposits.refunded) }}</dd></div>
                <div v-if="data.deposits.kept"><dt>Kept by the owner</dt><dd>{{ peso(data.deposits.kept) }}</dd></div>
              </dl>
              <p class="muted">A deposit is yours until you move out and the owner settles it.</p>
            </DlCard>
          </div>

          <DlCard padding="4px 16px">
            <DlListRow :icon="Receipt" title="My bills" subtitle="What to pay now, receipts and statements" to="/boarder/bills" />
            <DlListRow :icon="Users" title="Room group" subtitle="Shared costs and paybacks" to="/groups" divider />
          </DlCard>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue'
import { Receipt, Users, Wallet } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { DlCard, DlEmptyState, DlListRow, DlRefresher, DlSkeleton, DlStatCard } from '@/components/dl'
import DlChart from '@/components/dl/DlChart.vue'
import { useToast } from '@/composables/useToast'
import { monthLabel, type ChartTone } from '@/lib/charts'
import { manilaDate } from '@/lib/dayjs'
import { peso, pesoShort } from '@/lib/money'
import { errorMessage } from '@/services/api'
import { dashboardService } from '@/services/dashboard'
import type { TenantSpending } from '@/types/dashboard'

/** My spending (A11): a boarder's last 12 months of bills, payments, room-group shares and deposits. */
const toast = useToast()
const data = ref<TenantSpending | null>(null)

const t = computed(() => data.value!.totals)
const empty = computed(() => !!data.value && !t.value.billed && !t.value.paid && !t.value.group && !data.value.deposits.paid)
const day = (date: string) => manilaDate(date).format('D MMM YYYY')

const slices = computed(() =>
  ([
    { label: 'Rent', centavos: t.value.rent, tone: 'pine' },
    { label: 'Utilities', centavos: t.value.utilities, tone: 'sky' },
    { label: 'Other charges', centavos: t.value.other, tone: 'coral' },
    { label: 'Room group', centavos: t.value.group, tone: 'lilac' },
  ] as { label: string; centavos: number; tone: ChartTone }[]).filter((s) => s.centavos > 0))

const depositCaption = computed(() => {
  const d = data.value!.deposits
  if (d.held) return 'Returned when you move out'
  return d.refunded ? `${pesoShort(d.refunded)} refunded` : 'No deposit held'
})

async function load() {
  try {
    data.value = await dashboardService.spending()
  } catch (e) {
    toast.error(errorMessage(e))
  }
}

onIonViewWillEnter(load)
</script>

<style scoped>
.spending {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 960px;
  margin: 0 auto 24px;
}
.period {
  margin: 0;
}
.tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
.grid h2 {
  margin: 0;
}
.grid .muted {
  margin: 2px 0 12px;
}
.figures {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 12px 0;
}
.figures div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.figures dt {
  color: var(--text-secondary);
}
.figures dd {
  margin: 0;
  font-family: var(--font-mono);
  font-size: 13px;
}

@media (min-width: 768px) {
  .tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .wide-card {
    grid-column: 1 / -1;
  }
}
</style>
