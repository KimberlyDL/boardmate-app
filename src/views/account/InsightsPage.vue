<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="backHref" /></ion-buttons>
        <ion-title>Insights</ion-title>
        <ion-buttons v-if="data" slot="end">
          <ion-button :disabled="busy" @click="pdf"><FileDown slot="start" :size="18" class="btn-icon" />PDF</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="insights">
        <!-- Filters: property and period -->
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
        <PeriodFilter v-model="period" />

        <DlBanner v-if="denied" tone="info" title="Only the owner and Managers see finances">
          Ask the owner if you need these figures.
        </DlBanner>

        <template v-else-if="!data">
          <div class="skeleton-tiles">
            <DlSkeleton v-for="i in 4" :key="i" :height="96" :radius="18" />
          </div>
          <DlSkeleton :height="260" :radius="18" />
        </template>

        <template v-else>
          <p class="dl-eyebrow period">{{ scopeName }} · {{ periodText(data.period) }}</p>

          <!-- One property: its rooms are one tap away -->
          <DlCard v-if="single" padding="4px 16px">
            <DlListRow :icon="DoorOpen" title="Rooms and stays" :subtitle="`Each room of ${single.name}, then each stay`" @click="openProperty(single.id)" />
          </DlCard>

          <FinanceOverview :totals="data.totals" :previous="data.previous" :series="data.series" :occupancy="data.occupancy_series" :house="data.house" :period="data.period" />

          <!-- Each property, when looking at all of them -->
          <DlSection v-if="!propertyId && data.by_property.length > 1" title="By property">
            <DlCard padding="4px 16px">
              <DlListRow
                v-for="(p, i) in data.by_property"
                :key="p.property.id"
                :title="p.property.name"
                :subtitle="`Collected ${pesoShort(p.collected.total)} · ${percent(p.collection.rate)} paid · ${p.outstanding.overdue ? pesoShort(p.outstanding.overdue) + ' overdue' : 'nothing overdue'}`"
                :trailing="`${p.occupancy.occupied}/${p.occupancy.places}`"
                :divider="i > 0"
                @click="openProperty(p.property.id)"
              />
            </DlCard>
          </DlSection>

          <p class="muted note">
            Collected is money received: payments and first rent at move-in, not deposits used at settlement.
            Collection rate is how much of what fell due in the period is paid so far, late payments included.
          </p>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
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
import { DoorOpen, FileDown } from 'lucide-vue-next'
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import FinanceOverview from '@/components/insights/FinanceOverview.vue'
import PeriodFilter from '@/components/insights/PeriodFilter.vue'
import { DlBanner, DlCard, DlListRow, DlRefresher, DlSection, DlSkeleton } from '@/components/dl'
import { useToast } from '@/composables/useToast'
import { openDocument } from '@/lib/documents'
import { DEFAULT_PERIOD, percent, periodDates, periodText, periodToQuery, type PeriodChoice } from '@/lib/insights'
import { pesoShort } from '@/lib/money'
import { firstError } from '@/services/api'
import { financeService } from '@/services/finance'
import { useAuthStore } from '@/stores/auth'
import type { FinanceRef, PortfolioFinance } from '@/types/finance'

/**
 * Insights (A11): the owner's and Managers' finances with charts, for every property they
 * see finances of or one, over a period, each headline against the period before.
 * A property opens its rooms, a room its stays (the period goes along in the link).
 */
const toast = useToast()
const auth = useAuthStore()
const router = useRouter()
const data = ref<PortfolioFinance | null>(null)
const properties = ref<FinanceRef[]>([])
const propertyId = ref(0)
const period = ref<PeriodChoice>({ ...DEFAULT_PERIOD })
const denied = ref(false)
const busy = ref(false)

const backHref = computed(() => (auth.user?.active_role === 'caretaker' ? '/caretaker/home' : '/owner/home'))
/** The one property shown, when a property is picked or there is only one. */
const single = computed(() => (propertyId.value ? properties.value.find((p) => p.id === propertyId.value) : properties.value.length === 1 ? properties.value[0] : undefined))
const scopeName = computed(() => single.value?.name ?? 'All properties')

async function load() {
  const dates = periodDates(period.value)
  if (period.value.preset === 'custom' && !dates) return
  try {
    const result = await financeService.portfolio(dates ?? {}, propertyId.value || null)
    data.value = result
    properties.value = result.properties
    denied.value = false
  } catch (e) {
    if (axios.isAxiosError(e) && e.response?.status === 403) denied.value = true
    else toast.error(firstError(e))
  }
}

watch(period, load)

function openProperty(id: number) {
  router.push({ path: `/insights/properties/${id}`, query: periodToQuery(period.value) })
}

async function pdf() {
  busy.value = true
  try {
    await openDocument(() => financeService.portfolioPdf(periodDates(period.value) ?? {}, propertyId.value || null))
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
  max-width: var(--content-wide);
  margin: 0 auto;
}
.period,
.note {
  margin: 0;
}
.note {
  margin-bottom: 24px;
}
.skeleton-tiles {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
</style>
