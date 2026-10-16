<template>
  <div>
    <ion-card class="summary">
      <ion-card-content>
        <div class="line">
          <span>Unpaid now</span>
          <strong>{{ peso(unpaidTotal) }}</strong>
        </div>
        <p class="muted small">{{ unpaidCount }} bill{{ unpaidCount === 1 ? '' : 's' }} not fully paid<template v-if="pendingCount"> · {{ pendingCount }} payment{{ pendingCount === 1 ? '' : 's' }} to confirm</template></p>
        <div class="actions">
          <ion-button size="small" :disabled="!payers.length" @click="recording = true">Record a payment</ion-button>
          <ion-button v-if="canEditBills" size="small" fill="outline" :disabled="!payers.length" @click="charging = true">Add a charge</ion-button>
        </div>
      </ion-card-content>
    </ion-card>

    <ion-segment :value="view" :scrollable="true" @ion-change="switchView(String($event.detail.value))">
      <ion-segment-button value="pending"><ion-label>To confirm<template v-if="pendingCount"> ({{ pendingCount }})</template></ion-label></ion-segment-button>
      <ion-segment-button value="unpaid"><ion-label>Unpaid</ion-label></ion-segment-button>
      <ion-segment-button value="paid"><ion-label>Paid</ion-label></ion-segment-button>
      <ion-segment-button value="payments"><ion-label>Payments</ion-label></ion-segment-button>
    </ion-segment>

    <p v-if="loading" class="muted">Loading…</p>

    <!-- Bills -->
    <template v-else-if="view === 'unpaid' || view === 'paid'">
      <p v-if="!bills.length" class="muted center">{{ view === 'unpaid' ? 'Everything is paid.' : 'No paid bills yet.' }}</p>
      <ion-card v-for="b in bills" :key="b.id" button @click="openBill = b">
        <ion-card-header>
          <ion-card-subtitle>{{ b.number }} · {{ b.kind_label }}<template v-if="b.room_label"> · Room {{ b.room_label }}</template></ion-card-subtitle>
          <ion-card-title>{{ b.payer.name }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>
            Due {{ manilaDate(b.due_on).format('MMM D, YYYY') }} · total {{ peso(b.total_centavos) }}
            <template v-if="b.status !== 'paid'"> · <strong>{{ peso(b.balance_centavos) }} left</strong></template>
          </p>
          <ion-badge :color="billStatus(b).color">{{ billStatus(b).label }}</ion-badge>
        </ion-card-content>
      </ion-card>
    </template>

    <!-- Payments: to confirm, or the history -->
    <template v-else>
      <p v-if="!payments.length" class="muted center">{{ view === 'pending' ? 'No payments waiting for you.' : 'No payments yet.' }}</p>
      <ion-card v-for="p in payments" :key="p.id">
        <ion-card-header>
          <ion-card-subtitle>
            {{ p.method_label }} · paid {{ manilaDate(p.paid_on).format('MMM D, YYYY') }}<template v-if="p.receipt_number"> · {{ p.receipt_number }}</template>
          </ion-card-subtitle>
          <ion-card-title>{{ p.payer.name }} · {{ peso(p.amount_centavos) }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p v-if="p.reference">
            Ref {{ p.reference }}
            <ion-badge v-if="p.reference_reused" color="danger">Used before</ion-badge>
          </p>
          <p v-if="p.note">“{{ p.note }}”</p>
          <p class="small">
            <template v-if="p.reported_by_payer">Reported by {{ p.payer.name }}</template>
            <template v-else>Recorded by {{ p.submitted_by }}</template>
            <template v-if="p.decided_by && p.reported_by_payer"> · {{ p.status === 'rejected' ? 'rejected' : 'confirmed' }} by {{ p.decided_by }}</template>
          </p>
          <p v-if="p.reject_reason" class="small">Reason: {{ p.reject_reason }}</p>
          <p v-if="p.reversal" class="small">Reversed by {{ p.reversal.by }} on {{ manilaDate(p.reversal.on).format('MMM D, YYYY') }}: {{ p.reversal.reason }}</p>
          <ion-badge :color="paymentColor[p.status]">{{ p.status_label }}</ion-badge>
          <a v-if="p.proof_url" :href="p.proof_url" target="_blank" rel="noopener" class="proof">See proof</a>

          <div v-if="p.status === 'pending' && canConfirm" class="actions">
            <ion-button size="small" :disabled="busy" @click="confirm(p)">Confirm</ion-button>
            <ion-button size="small" fill="outline" color="danger" :disabled="busy" @click="reject(p)">Reject</ion-button>
          </div>
          <div v-else-if="p.status === 'confirmed' && canEditBills" class="actions">
            <ion-button size="small" fill="clear" color="danger" :disabled="busy" @click="reverse(p)">Reverse</ion-button>
          </div>
        </ion-card-content>
      </ion-card>
    </template>

    <ion-button v-if="page < lastPage" expand="block" fill="clear" @click="load(false)">Show more</ion-button>

    <record-payment-modal :open="recording" :property-id="property.id" :payers="payers" @close="recording = false" @done="done" />
    <charge-modal :open="charging" :property-id="property.id" :payers="payers" @close="charging = false" @done="done" />
    <bill-modal :bill="openBill" :can-correct="canEditBills" @close="openBill = null" @changed="corrected" />
  </div>
</template>

<script setup lang="ts">
import { IonBadge, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonLabel, IonSegment, IonSegmentButton } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import BillModal from '@/components/billing/BillModal.vue'
import ChargeModal from '@/components/billing/ChargeModal.vue'
import RecordPaymentModal from '@/components/billing/RecordPaymentModal.vue'
import { billStatus, paymentColor, toPayers, type Payer } from '@/lib/billing'
import { manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { tenancyService } from '@/services/tenancies'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Bill, Payment } from '@/types/billing'
import type { Property } from '@/types/property'
import type { Tenancy } from '@/types/tenancy'

const props = defineProps<{ property: Property }>()

const toast = useToast()
const prompt = usePrompt()
const can = (ability: string) => props.property.abilities.includes(ability as never)
const canConfirm = computed(() => can('confirm_payment_proofs'))
const canEditBills = computed(() => can('edit_issued_bills'))

const view = ref('unpaid')
const bills = ref<Bill[]>([])
const payments = ref<Payment[]>([])
const payers = ref<Payer[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(true)
const busy = ref(false)
const unpaidTotal = ref(0)
const unpaidCount = ref(0)
const pendingCount = ref(0)
const recording = ref(false)
const charging = ref(false)
const openBill = ref<Bill | null>(null)

async function load(reset = true) {
  if (reset) loading.value = true
  const next = reset ? 1 : page.value + 1
  try {
    if (view.value === 'unpaid' || view.value === 'paid') {
      const { items, meta } = await billingService.bills(props.property.id, { status: view.value, page: next })
      bills.value = reset ? items : [...bills.value, ...items]
      unpaidTotal.value = meta.unpaid_total_centavos
      unpaidCount.value = meta.unpaid_count
      page.value = meta.current_page
      lastPage.value = meta.last_page
    } else {
      const { items, meta } = await billingService.payments(props.property.id, { status: view.value === 'pending' ? 'pending' : undefined, page: next })
      payments.value = reset ? items : [...payments.value, ...items]
      pendingCount.value = meta.pending_count
      page.value = meta.current_page
      lastPage.value = meta.last_page
    }
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

/** The counts on top, whatever list is showing. */
async function refreshCounts() {
  try {
    const [b, p] = await Promise.all([
      billingService.bills(props.property.id, { status: 'unpaid' }),
      billingService.payments(props.property.id, { status: 'pending' }),
    ])
    unpaidTotal.value = b.meta.unpaid_total_centavos
    unpaidCount.value = b.meta.unpaid_count
    pendingCount.value = p.meta.pending_count
  } catch {
    /* the list shows its own error */
  }
}

async function loadPayers() {
  const all: Tenancy[] = []
  let current = 1
  let last = 1
  do {
    const { items, meta } = await tenancyService.list(props.property.id, undefined, current)
    all.push(...items)
    last = meta.last_page
    current++
  } while (current <= last)
  payers.value = toPayers(all)
}

onMounted(async () => {
  await refreshCounts()
  if (pendingCount.value) view.value = 'pending'
  await load()
  loadPayers().catch((e) => toast.error(firstError(e)))
})

function switchView(next: string) {
  view.value = next
  load()
}

function done(message: string) {
  recording.value = false
  charging.value = false
  toast.success(message)
  load()
  refreshCounts()
}

function corrected(bill: Bill, message: string) {
  openBill.value = bill
  toast.success(message)
  load()
  refreshCounts()
}

async function act(action: () => Promise<{ message: string }>) {
  busy.value = true
  try {
    toast.success((await action()).message)
    await Promise.all([load(), refreshCounts()])
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function confirm(p: Payment) {
  const warning = p.reference_reused ? ' Its reference no. was used on another payment before.' : ''
  if (!(await prompt.confirm('Confirm this payment?', `${peso(p.amount_centavos)} from ${p.payer.name}. A receipt is issued and it is applied to their bills.${warning}`, 'Confirm'))) return
  await act(() => billingService.confirm(p.id))
}

async function reject(p: Payment) {
  const reason = await prompt.reason('Reject this payment?', `${p.payer.name} is told the reason and the bills stay unpaid.`, 'Reject', 'Reason (shown to the boarder)')
  if (reason) await act(() => billingService.reject(p.id, reason))
}

async function reverse(p: Payment) {
  const reason = await prompt.reason(
    'Reverse this payment?',
    `For a mistake only. ${p.receipt_number} stays on record as reversed and the bills it paid are owed again.`,
    'Reverse',
    'Reason (shown to the boarder)',
  )
  if (reason) await act(() => billingService.reverse(p.id, reason))
}
</script>

<style scoped>
.summary .line {
  display: flex;
  justify-content: space-between;
  font-size: 1.1rem;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.small {
  font-size: 0.85rem;
}
.proof {
  margin-left: 8px;
  color: var(--ion-color-primary);
}
</style>
