<template>
  <div>
    <ion-segment :value="tab" @ion-change="setTab(String($event.detail.value))">
      <ion-segment-button value="decide"><ion-label>To decide ({{ lateEntries.length + overnight.length }})</ion-label></ion-segment-button>
      <ion-segment-button value="visitors"><ion-label>Visitors</ion-label></ion-segment-button>
      <ion-segment-button v-if="hasCurfew" value="log"><ion-label>Curfew log</ion-label></ion-segment-button>
    </ion-segment>

    <p v-if="loading" class="muted">Loading…</p>

    <!-- Requests waiting for a decision -->
    <template v-else-if="tab === 'decide'">
      <p v-if="!lateEntries.length && !overnight.length" class="muted center">Nothing to decide.</p>

      <template v-if="lateEntries.length">
        <h3>Coming back late</h3>
        <ion-list lines="full">
          <ion-item v-for="r in lateEntries" :key="r.id">
            <ion-label class="ion-text-wrap">
              <h2>{{ r.tenant.name }}<template v-if="r.room"> · room {{ r.room.label }}</template></h2>
              <p>{{ manilaDate(r.on_date).format('ddd, MMM D') }} · back by {{ clockTime(r.expected_arrival) }}</p>
              <p>{{ r.reason }}</p>
            </ion-label>
            <ion-buttons slot="end">
              <ion-button size="small" :disabled="busy" @click="run(() => houseOpsService.approveLate(r.id))">Approve</ion-button>
              <ion-button size="small" fill="clear" color="danger" :disabled="busy" @click="declineLate(r)">Decline</ion-button>
            </ion-buttons>
          </ion-item>
        </ion-list>
      </template>

      <template v-if="overnight.length">
        <h3>Overnight visitors</h3>
        <ion-list lines="full">
          <ion-item v-for="v in overnight" :key="v.id">
            <ion-label class="ion-text-wrap">
              <h2>
                {{ v.name }} <span class="muted">visiting {{ v.tenant.name }}</span>
                <ion-badge v-if="v.over_limit" color="warning">Over the monthly limit</ion-badge>
              </h2>
              <p>{{ manilaDate(v.visit_on).format('ddd, MMM D') }} · {{ v.nights }} night{{ v.nights === 1 ? '' : 's' }}</p>
            </ion-label>
            <ion-buttons slot="end">
              <ion-button size="small" :disabled="busy" @click="run(() => houseOpsService.approveVisitor(v.id))">Approve</ion-button>
              <ion-button size="small" fill="clear" color="danger" :disabled="busy" @click="declineVisitor(v)">Decline</ion-button>
            </ion-buttons>
          </ion-item>
        </ion-list>
      </template>
    </template>

    <!-- Visitors today, and anyone still checked in -->
    <template v-else-if="tab === 'visitors'">
      <ion-button size="small" fill="outline" class="gap" @click="logging = 'walk_in'">Log a walk-in</ion-button>
      <p v-if="!visitors.length" class="muted center">No visitors today.</p>
      <ion-list v-else lines="full">
        <ion-item v-for="v in visitors" :key="v.id">
          <ion-label class="ion-text-wrap">
            <h2>
              {{ v.name }} <span class="muted">visiting {{ v.tenant.name }}</span>
              <ion-badge v-if="v.is_walk_in" color="medium">Walk-in</ion-badge>
              <ion-badge v-if="v.over_limit" color="warning">Over the limit</ion-badge>
            </h2>
            <p>
              {{ v.status_label }}
              <template v-if="v.overnight"> · {{ v.nights }} night{{ v.nights === 1 ? '' : 's' }}</template>
              <template v-else-if="v.expected_in"> · expected {{ clockTime(v.expected_in) }}</template>
              <template v-if="v.contact"> · {{ v.contact }}</template>
            </p>
          </ion-label>
          <ion-button v-if="v.can.check_in" slot="end" size="small" :disabled="busy" @click="run(() => houseOpsService.checkIn(v.id))">Check in</ion-button>
          <ion-button v-else-if="v.can.check_out" slot="end" size="small" fill="outline" :disabled="busy" @click="run(() => houseOpsService.checkOut(v.id))">Check out</ion-button>
        </ion-item>
      </ion-list>
    </template>

    <!-- Late arrivals without an approved request -->
    <template v-else-if="tab === 'log'">
      <ion-button size="small" fill="outline" class="gap" @click="logging = 'violation'">Log a late arrival</ion-button>
      <ion-card v-if="repeatedNames.length" class="flag">
        <ion-card-content>
          <strong>Repeated late arrivals</strong> (3 or more in 30 days): {{ repeatedNames.join(', ') }}. The app adds no fee; you decide.
        </ion-card-content>
      </ion-card>
      <p v-if="!violations.length" class="muted center">Nothing logged.</p>
      <ion-list v-else lines="full">
        <ion-item v-for="v in violations" :key="v.id">
          <ion-label class="ion-text-wrap">
            <h2>{{ v.tenant.name }}<template v-if="v.room"> · room {{ v.room.label }}</template></h2>
            <p>
              {{ manilaDate(v.on_date).format('ddd, MMM D') }}<template v-if="v.arrived_at"> · arrived {{ clockTime(v.arrived_at) }}</template>
              <template v-if="v.logged_by"> · logged by {{ v.logged_by }}</template>
            </p>
            <p v-if="v.note">{{ v.note }}</p>
          </ion-label>
          <ion-button v-if="canRemove" slot="end" size="small" fill="clear" color="danger" :disabled="busy" @click="removeViolation(v)">Remove</ion-button>
        </ion-item>
      </ion-list>
    </template>

    <staff-log-sheet :mode="logging" :property-id="property.id" :tenants="tenants" @close="logging = null" @done="logged" />
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonButtons, IonCard, IonCardContent, IonItem, IonLabel, IonList, IonSegment, IonSegmentButton } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import StaffLogSheet from '@/components/houseOps/StaffLogSheet.vue'
import { clockTime, manilaDate } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { houseOpsService } from '@/services/houseOps'
import { propertyService } from '@/services/properties'
import { tenancyService } from '@/services/tenancies'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { CurfewViolation, LateEntry, Visitor } from '@/types/houseOps'
import type { Property } from '@/types/property'

type Tab = 'decide' | 'visitors' | 'log'

/** Curfew (D2) and visitors (D4) for the owner and caretakers: decide requests, check visitors in and out, keep the curfew log. */
const props = defineProps<{ property: Property }>()

const toast = useToast()
const prompt = usePrompt()
const tab = ref<Tab>('decide')
const hasCurfew = ref(false)
const loading = ref(true)
const busy = ref(false)
const lateEntries = ref<LateEntry[]>([])
const overnight = ref<Visitor[]>([])
const visitors = ref<Visitor[]>([])
const violations = ref<CurfewViolation[]>([])
const repeated = ref<Record<number, number>>({})
const tenants = ref<{ id: number; name: string; where: string }[]>([])
const logging = ref<'walk_in' | 'violation' | null>(null)

const canRemove = computed(() => props.property.abilities.includes('manage_tenancies' as never))
const repeatedNames = computed(() => {
  const names = new Map<number, string>()
  violations.value.forEach((v) => names.set(v.tenancy_id, v.tenant.name ?? ''))
  return Object.keys(repeated.value).map((id) => `${names.get(Number(id)) ?? 'A tenant'} (${repeated.value[Number(id)]})`)
})

async function load() {
  try {
    const id = props.property.id
    hasCurfew.value = !!(await propertyService.settings(id)).values.curfew_time
    const [late, pending, today, log, stays] = await Promise.all([
      hasCurfew.value ? houseOpsService.propertyLateEntries(id) : Promise.resolve([]),
      houseOpsService.propertyVisitors(id, 'pending'),
      houseOpsService.propertyVisitors(id, 'today'),
      hasCurfew.value ? houseOpsService.propertyViolations(id) : Promise.resolve({ items: [], repeated: {} }),
      tenancyService.list(id),
    ])
    lateEntries.value = late
    overnight.value = pending
    visitors.value = today
    violations.value = log.items
    repeated.value = log.repeated
    tenants.value = stays.items.map((t) => ({ id: t.id, name: t.tenant.name, where: `room ${t.room.label}` }))
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

onMounted(load)

function setTab(next: string) {
  tab.value = next as Tab
}

async function run(action: () => Promise<{ message: string }>) {
  busy.value = true
  try {
    toast.success((await action()).message)
    await load()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function declineLate(r: LateEntry) {
  const reason = await prompt.reason('Decline this request?', `${r.tenant.name}, ${manilaDate(r.on_date).format('MMM D')}. They see the reason.`, 'Decline', 'Reason (shown to the boarder)')
  if (reason) await run(() => houseOpsService.declineLate(r.id, reason))
}

async function declineVisitor(v: Visitor) {
  const reason = await prompt.reason('Decline this overnight stay?', `${v.name}, visiting ${v.tenant.name}. They see the reason.`, 'Decline', 'Reason (shown to the boarder)')
  if (reason) await run(() => houseOpsService.declineVisitor(v.id, reason))
}

async function removeViolation(v: CurfewViolation) {
  if (!(await prompt.confirm('Remove this entry?', `${v.tenant.name}, ${manilaDate(v.on_date).format('MMM D')}. Only for one logged by mistake.`, 'Remove'))) return
  await run(async () => ({ message: await houseOpsService.removeViolation(v.id) }))
}

async function logged(message: string) {
  logging.value = null
  toast.success(message)
  await load()
}
</script>

<style scoped>
.gap {
  margin-top: 12px;
}
.flag {
  border-left: 4px solid var(--ion-color-warning);
}
</style>
