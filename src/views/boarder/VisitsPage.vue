<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/stay" /></ion-buttons>
        <ion-title>Visitors &amp; curfew</ion-title>
      </ion-toolbar>
      <ion-toolbar v-if="stay && curfew">
        <ion-segment :value="tab" @ion-change="tab = String($event.detail.value) as Tab">
          <ion-segment-button value="visitors"><ion-label>Visitors</ion-label></ion-segment-button>
          <ion-segment-button value="late"><ion-label>Late entry</ion-label></ion-segment-button>
          <ion-segment-button value="log"><ion-label>Curfew log</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="load" />

      <div class="narrow">
        <DlSkeleton v-if="loading" :height="160" :radius="18" />
        <DlCard v-else-if="!stay">
          <DlEmptyState note="not staying yet" :icon="House">You are not staying anywhere right now.</DlEmptyState>
        </DlCard>

        <!-- Visitors (D4) -->
        <template v-else-if="tab === 'visitors'">
          <ion-button expand="block" class="gap" @click="registering = true"><UserPlus slot="start" :size="18" aria-hidden="true" /> Register a visitor</ion-button>
          <DlBanner v-if="nights" tone="info" class="gap">
            Overnight: {{ nights.used }} of {{ nights.limit }} nights used this month<template v-if="nights.needs_approval">; each stay needs approval</template>.
          </DlBanner>
          <DlCard v-if="!visitors.length">
            <DlEmptyState note="no visitors yet" :icon="Users">No visitors yet.</DlEmptyState>
          </DlCard>
          <ion-list v-else lines="full">
            <ion-item v-for="v in visitors" :key="v.id">
              <ion-label class="ion-text-wrap">
                <h2>
                  {{ v.name }}
                  <ion-badge v-if="v.over_limit" color="warning">Over the limit</ion-badge>
                </h2>
                <p>
                  {{ manilaDate(v.visit_on).format('ddd, MMM D') }}
                  <template v-if="v.overnight"> · {{ v.nights }} night{{ v.nights === 1 ? '' : 's' }}</template>
                  <template v-else-if="v.expected_in"> · {{ clockTime(v.expected_in) }}<template v-if="v.expected_out">–{{ clockTime(v.expected_out) }}</template></template>
                  <template v-if="v.is_walk_in"> · walk-in</template>
                </p>
                <p v-if="v.decline_reason" class="warn small">Declined: {{ v.decline_reason }}</p>
              </ion-label>
              <ion-badge slot="end" :color="visitorColor(v.status)">{{ v.status_label }}</ion-badge>
              <ion-button v-if="v.can.cancel" slot="end" size="small" fill="clear" color="medium" :disabled="busy" @click="cancelVisitor(v)">Cancel</ion-button>
            </ion-item>
          </ion-list>
        </template>

        <!-- Late entry (D2) -->
        <template v-else-if="tab === 'late'">
          <ion-button expand="block" class="gap" @click="askingLate = true"><DoorOpen slot="start" :size="18" aria-hidden="true" /> Ask to come back late</ion-button>
          <DlBanner tone="info" :icon="Moon" class="gap">The curfew is {{ clockTime(curfew!) }}. Ask up to 7 days ahead.</DlBanner>
          <DlCard v-if="!lateEntries.length">
            <DlEmptyState note="no requests yet" :icon="DoorOpen">No requests yet.</DlEmptyState>
          </DlCard>
          <ion-list v-else lines="full">
            <ion-item v-for="r in lateEntries" :key="r.id">
              <ion-label class="ion-text-wrap">
                <h2>{{ manilaDate(r.on_date).format('ddd, MMM D') }} · back by {{ clockTime(r.expected_arrival) }}</h2>
                <p>{{ r.reason }}</p>
                <p v-if="r.decline_reason" class="warn small">Declined: {{ r.decline_reason }}</p>
              </ion-label>
              <ion-badge slot="end" :color="r.status === 'approved' ? 'success' : r.status === 'pending' ? 'warning' : 'medium'">{{ r.status_label }}</ion-badge>
              <ion-button v-if="r.can.cancel" slot="end" size="small" fill="clear" color="medium" :disabled="busy" @click="cancelLate(r)">Cancel</ion-button>
            </ion-item>
          </ion-list>
        </template>

        <!-- My curfew log (D2): a record only -->
        <template v-else-if="tab === 'log'">
          <p class="dl-small gap">Late arrivals without an approved request. This is a record only; no fee is added by the app.</p>
          <DlCard v-if="!violations.length">
            <DlEmptyState note="nothing logged" :icon="Moon">Nothing logged.</DlEmptyState>
          </DlCard>
          <ion-list v-else lines="full">
            <ion-item v-for="v in violations" :key="v.id">
              <ion-label class="ion-text-wrap">
                <h2>{{ manilaDate(v.on_date).format('ddd, MMM D') }}<template v-if="v.arrived_at"> · arrived {{ clockTime(v.arrived_at) }}</template></h2>
                <p v-if="v.note">{{ v.note }}</p>
              </ion-label>
            </ion-item>
          </ion-list>
        </template>
      </div>

      <template v-if="stay">
        <visitor-sheet :open="registering" :tenancy-id="stay.id" :nights-info="nights" @close="registering = false" @done="registered" />
        <late-entry-sheet v-if="curfew" :open="askingLate" :tenancy-id="stay.id" :curfew="clockTime(curfew)" @close="askingLate = false" @done="asked" />
      </template>
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
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { DoorOpen, House, Moon, UserPlus, Users } from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import LateEntrySheet from '@/components/houseOps/LateEntrySheet.vue'
import VisitorSheet from '@/components/houseOps/VisitorSheet.vue'
import { DlBanner, DlCard, DlEmptyState, DlRefresher, DlSkeleton } from '@/components/dl'
import { clockTime, manilaDate } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { houseOpsService } from '@/services/houseOps'
import { tenancyService } from '@/services/tenancies'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { VisitorStatus } from '@/types/enums'
import type { CurfewViolation, LateEntry, NightsUsed, Visitor } from '@/types/houseOps'
import type { Tenancy } from '@/types/tenancy'

type Tab = 'visitors' | 'late' | 'log'

/** The tenant's visitors (D4), late-entry requests and curfew log (D2). `?tab=late` opens late entry. */
const route = useRoute()
const toast = useToast()
const prompt = usePrompt()
const stay = ref<Tenancy | null>(null)
const visitors = ref<Visitor[]>([])
const nights = ref<NightsUsed | null>(null)
const lateEntries = ref<LateEntry[]>([])
const violations = ref<CurfewViolation[]>([])
const loading = ref(true)
const busy = ref(false)
const tab = ref<Tab>(route.query.tab === 'late' ? 'late' : 'visitors')
const registering = ref(false)
const askingLate = ref(false)

const curfew = computed(() => stay.value?.curfew?.time ?? null)

async function load() {
  try {
    stay.value = (await tenancyService.mine())[0] ?? null
    if (!stay.value) return
    const id = stay.value.id
    const [v, late, log] = await Promise.all([
      houseOpsService.visitors(id),
      curfew.value ? houseOpsService.lateEntries(id) : Promise.resolve([]),
      curfew.value ? houseOpsService.violations(id) : Promise.resolve([]),
    ])
    visitors.value = v.items
    nights.value = v.nights
    lateEntries.value = late
    violations.value = log
    if (!curfew.value) tab.value = 'visitors'
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)


function visitorColor(status: VisitorStatus) {
  if (status === 'approved' || status === 'registered' || status === 'checked_in') return 'success'
  if (status === 'pending') return 'warning'
  if (status === 'declined') return 'danger'
  return 'medium'
}

async function done(message: string) {
  toast.success(message)
  await load()
}

async function registered(message: string) {
  registering.value = false
  await done(message)
}

async function asked(message: string) {
  askingLate.value = false
  await done(message)
}

async function run(action: () => Promise<{ message: string }>) {
  busy.value = true
  try {
    await done((await action()).message)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function cancelVisitor(v: Visitor) {
  if (await prompt.confirm('Cancel this visit?', `${v.name}, ${manilaDate(v.visit_on).format('MMM D')}.`, 'Cancel visit')) await run(() => houseOpsService.cancelVisitor(v.id))
}

async function cancelLate(r: LateEntry) {
  if (await prompt.confirm('Cancel this request?', `Coming back late on ${manilaDate(r.on_date).format('MMM D')}.`, 'Cancel request')) await run(() => houseOpsService.cancelLate(r.id))
}
</script>

<style scoped>
.gap {
  margin: 0 0 var(--card-gap);
}
.small {
  font-size: 0.85rem;
}
.warn {
  color: var(--ion-color-danger);
}
</style>
