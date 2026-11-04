<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="backHref" /></ion-buttons>
        <ion-title>Collections</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="collections">
        <ion-select
          v-if="properties.length > 1"
          v-model="propertyId"
          label="Property"
          label-placement="stacked"
          fill="outline"
          interface="popover"
          @ion-change="load"
        >
          <ion-select-option :value="0">All my properties</ion-select-option>
          <ion-select-option v-for="p in properties" :key="p.id" :value="p.id">{{ p.name }}</ion-select-option>
        </ion-select>

        <DlBanner v-if="denied" tone="info" title="Nothing to collect here">
          Collections are for the owner and caretakers who follow up payments.
        </DlBanner>

        <template v-else-if="!data">
          <div class="tiles">
            <DlSkeleton v-for="i in 4" :key="i" :height="96" :radius="18" />
          </div>
          <DlSkeleton :height="220" :radius="18" />
        </template>

        <template v-else>
          <p class="dl-eyebrow period">{{ scopeName }} · As of {{ day(data.week.to, 'D MMM YYYY') }}</p>

          <div class="tiles">
            <DlStatCard
              label="Received · 7 days"
              :value="pesoShort(data.received.centavos)"
              :caption="`${data.received.payments} payment${data.received.payments === 1 ? '' : 's'}`"
              dark
            />
            <DlStatCard
              label="Due in 7 days"
              :value="pesoShort(data.due_soon.centavos)"
              :caption="`${data.due_soon.bills} bill${data.due_soon.bills === 1 ? '' : 's'}`"
              tone="butter"
            />
            <DlStatCard
              label="Overdue"
              :value="pesoShort(data.overdue.centavos)"
              :caption="overdueCaption"
              :tone="data.overdue.centavos ? 'coral' : 'pine'"
            />
            <DlStatCard
              v-if="data.proofs_waiting !== null"
              label="Proofs to check"
              :value="data.proofs_waiting"
              :caption="data.proofs_waiting ? 'Payments boarders reported' : 'None waiting'"
              tone="sky"
              :to="single ? `/properties/${single.id}?tab=billing` : undefined"
            />
          </div>

          <div class="grid">
            <DlCard>
              <h2 class="dl-title">Received each day</h2>
              <p class="muted">{{ day(data.week.from, 'D MMM') }} – {{ day(data.week.to, 'D MMM') }}, confirmed payments on bills</p>
              <DlChart
                kind="bar"
                format="money"
                label="Payments received each day for the last 7 days"
                :labels="data.received.by_day.map((d) => day(d.date, 'ddd D'))"
                :series="[{ label: 'Received', data: data.received.by_day.map((d) => d.centavos), tone: 'pine' }]"
                :height="200"
              />
            </DlCard>

            <DlCard>
              <h2 class="dl-title">How long people are behind</h2>
              <p class="muted">By each person's oldest overdue bill<template v-if="data.overdue.under_review_bills"> · {{ data.overdue.under_review_bills }} {{ data.overdue.under_review_bills === 1 ? 'bill' : 'bills' }} being checked, not counted</template></p>
              <DlChart
                v-if="data.overdue.payers"
                kind="bar"
                format="money"
                horizontal
                label="Overdue amounts by how long people are behind"
                :labels="behind.map((b) => `${b.label} (${b.payers})`)"
                :series="[{ label: 'Overdue', data: behind.map((b) => b.centavos), tone: 'coral' }]"
                :height="200"
              />
              <p v-else class="empty">Nobody is behind.</p>
            </DlCard>
          </div>

          <DlSection v-if="data.most_behind.length" title="Most behind" :meta="`${data.overdue.payers} in all`">
            <DlCard padding="4px 16px">
              <DlListRow
                v-for="(r, i) in data.most_behind"
                :key="`${r.property.id}-${r.payer.id}`"
                :title="r.payer.name ?? 'Former boarder'"
                :subtitle="personLine(r)"
                :divider="i > 0"
                :to="`/properties/${r.property.id}?tab=billing`"
              >
                <template #leading><DlAvatar :name="r.payer.name ?? '?'" /></template>
                <template #trailing>
                  <span class="owed">
                    <strong>{{ pesoShort(r.overdue_centavos) }}</strong>
                    <DlStatusTag :status="r.is_late ? 'overdue' : 'due'">{{ r.is_late ? 'Late' : `${r.days_overdue} days` }}</DlStatusTag>
                  </span>
                </template>
              </DlListRow>
            </DlCard>
            <p class="muted">Open a person to record a payment, send a reminder or add a remark on the property's overdue list.</p>
          </DlSection>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import axios from 'axios'
import { computed, ref } from 'vue'
import { DlAvatar, DlBanner, DlCard, DlListRow, DlRefresher, DlSection, DlSkeleton, DlStatCard, DlStatusTag } from '@/components/dl'
import DlChart from '@/components/dl/DlChart.vue'
import { useToast } from '@/composables/useToast'
import { manilaDate } from '@/lib/dayjs'
import { pesoShort } from '@/lib/money'
import { firstError } from '@/services/api'
import { financeService } from '@/services/finance'
import { useAuthStore } from '@/stores/auth'
import type { CollectionsSummary, FinanceRef } from '@/types/finance'

/**
 * Collections (A11): for everyone who follows up payments, Collectors included. What comes due
 * this week, who is behind and for how long, and what came in over the last 7 days. No income
 * totals, costs or deposits: those stay on Insights for the owner and Managers.
 */
const toast = useToast()
const auth = useAuthStore()
const data = ref<CollectionsSummary | null>(null)
const properties = ref<FinanceRef[]>([])
const propertyId = ref(0)
const denied = ref(false)

const backHref = computed(() => (auth.user?.active_role === 'caretaker' ? '/caretaker/home' : '/owner/home'))
const single = computed(() => (propertyId.value ? properties.value.find((p) => p.id === propertyId.value) : properties.value.length === 1 ? properties.value[0] : undefined))
const scopeName = computed(() => single.value?.name ?? 'All properties')

const BEHIND_LABELS = { days_1_30: '1–30 days', days_31_60: '31–60 days', days_61_90: '61–90 days', over_90: 'Over 90 days' } as const
const behind = computed(() =>
  (Object.keys(BEHIND_LABELS) as (keyof typeof BEHIND_LABELS)[]).map((k) => ({ label: BEHIND_LABELS[k], ...data.value!.behind[k] })))

const overdueCaption = computed(() => {
  const o = data.value!.overdue
  if (!o.payers) return 'Nobody is behind'
  const people = `${o.payers} ${o.payers === 1 ? 'person' : 'people'}`
  return o.late_payers ? `${people} · ${o.late_payers} marked late` : people
})

const day = (date: string, format: string) => manilaDate(date).format(format)

/** "Santos House · Room 201 · promised 6 Nov" */
function personLine(r: CollectionsSummary['most_behind'][number]): string {
  return [
    properties.value.length > 1 ? r.property.name : null,
    r.room_label,
    r.promised_on ? `promised ${day(r.promised_on, 'D MMM')}` : null,
  ].filter(Boolean).join(' · ') || `${r.days_overdue} days overdue`
}

async function load() {
  try {
    const result = await financeService.collections(propertyId.value || null)
    data.value = result
    properties.value = result.properties
    denied.value = false
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 403) denied.value = true
    else toast.error(firstError(e))
  }
}

onIonViewWillEnter(load)
</script>

<style scoped>
.collections {
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
.empty {
  margin: 24px 0;
  color: var(--text-muted);
  text-align: center;
}
.owed {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

@media (min-width: 768px) {
  .tiles {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
