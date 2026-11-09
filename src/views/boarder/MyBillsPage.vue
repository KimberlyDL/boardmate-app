<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>My bills</ion-title>
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment :value="view" @ion-change="switchView(String($event.detail.value))">
          <ion-segment-button value="unpaid"><ion-label>To pay</ion-label></ion-segment-button>
          <ion-segment-button value="paid"><ion-label>Paid</ion-label></ion-segment-button>
          <ion-segment-button value="payments"><ion-label>My payments</ion-label></ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <DlRefresher :refresh="() => load()" />

      <div class="wide page">
        <!-- Desktop: what I owe and how to pay on the left, the bills on the right; stacked on phones. -->
        <div class="desk-cols">
          <div class="col">
            <DlCard v-if="!loading && !places.length && !roomShares.length">
              <DlEmptyState note="no bills yet" :icon="Receipt">Your bills start after you move in somewhere.</DlEmptyState>
            </DlCard>

            <!-- Room groups: what I pay in (for someone listed in a renter's room, this is all their money) -->
            <DlCard
              v-for="r in roomShares"
              :key="r.group_id"
              :tone="r.owe_centavos > 0 && !places.length ? 'ink' : undefined"
              :padding="20"
              class="place"
            >
              <span class="dl-eyebrow eyebrow">ROOM {{ r.room_label }} · {{ r.property_name }} · ROOM GROUP</span>
              <span class="big">{{ r.owe_centavos > 0 ? `You owe ${peso(r.owe_centavos)}` : 'Nothing to pay in' }}</span>
              <p v-if="!places.length" class="dl-small soft">
                The owner bills the person who rents the room. Your part of the shared bills is paid to them in the room group.
              </p>
              <ul v-if="r.items.length" class="shares">
                <li v-for="i in r.items" :key="i.line_id">
                  <span class="share-text">
                    <strong>{{ i.description }}</strong>
                    <span class="dl-small soft">Pay {{ i.owed_to }} · {{ i.is_overdue ? 'overdue since' : 'due' }} {{ manilaDate(i.due_on).format('MMM D') }}</span>
                  </span>
                  <span class="share-amount">
                    {{ peso(i.my_left_centavos) }}
                    <DlStatusTag v-if="i.is_overdue" status="overdue" />
                  </span>
                </li>
              </ul>
              <p v-if="r.owed_to_me_centavos" class="dl-small soft">Others owe you {{ peso(r.owed_to_me_centavos) }} here.</p>
              <ion-button size="small" class="dl-tonal statement" :router-link="`/groups/${r.group_id}`">
                {{ r.owe_centavos > 0 ? 'Pay back in the room group' : 'Open room group' }}
              </ion-button>
            </DlCard>

            <!-- Each place: what is owed, and how to pay -->
            <DlCard v-for="p in places" :key="p.property_id" :tone="p.owed_centavos > 0 ? 'ink' : 'pine'" :padding="20" class="place">
              <span class="dl-eyebrow eyebrow">{{ p.property_name }}</span>
              <span class="big">{{ p.owed_centavos > 0 ? `You owe ${peso(p.owed_centavos)}` : p.upcoming_rent ? 'Nothing due now' : 'All paid' }}</span>
              <p v-if="p.upcoming_rent" class="dl-small soft">
                Coming up: {{ p.upcoming_rent.label }}<template v-if="p.upcoming_rent.estimate_centavos !== null">, about {{ peso(p.upcoming_rent.estimate_centavos) }}</template>,
                due {{ manilaDate(p.upcoming_rent.due_on).format('MMM D') }}. Utilities are added on the bill.
              </p>
              <p v-if="p.credit_centavos" class="dl-small soft">You have {{ peso(p.credit_centavos) }} credit. It is used on your next bills.</p>

              <div class="how">
                <span class="dl-eyebrow eyebrow">HOW TO PAY</span>
                <template v-if="p.pay_to">
                  <p v-if="p.pay_to.gcash_number" class="pay-line">
                    <Smartphone :size="16" aria-hidden="true" />
                    <span>GCash {{ p.pay_to.gcash_number }}<template v-if="p.pay_to.gcash_name"> ({{ p.pay_to.gcash_name }})</template></span>
                  </p>
                  <p v-if="p.pay_to.bank_account_number" class="pay-line">
                    <Landmark :size="16" aria-hidden="true" />
                    <span>
                      {{ p.pay_to.bank_name ?? 'Bank' }} {{ p.pay_to.bank_account_number }}<template v-if="p.pay_to.bank_account_name"> ({{ p.pay_to.bank_account_name }})</template>
                    </span>
                  </p>
                </template>
                <p v-else class="dl-small soft">Ask the owner how to pay, or pay in cash and get a receipt.</p>
              </div>

              <ion-button size="small" class="dl-tonal statement" @click="statement(p)">Statement (PDF)</ion-button>
            </DlCard>

            <ion-button v-if="places.length" expand="block" class="dl-accent" @click="reporting = true">I paid: tell the owner</ion-button>

            <DlCard v-if="places.length" padding="4px 16px">
              <DlListRow :icon="ChartColumn" title="My spending" subtitle="Your last 12 months: rent, utilities and room costs" to="/spending" />
            </DlCard>
          </div>

          <div class="col">
            <template v-if="loading">
              <DlCard v-for="n in 3" :key="n" class="skeleton-row">
                <DlSkeleton :width="40" :height="40" :radius="12" />
                <div class="skeleton-lines"><DlSkeleton width="60%" :height="14" /><DlSkeleton width="45%" :height="10" /></div>
              </DlCard>
            </template>

            <!-- Bills -->
            <template v-else-if="view !== 'payments'">
              <DlCard v-if="places.length && !bills.length">
                <DlEmptyState :note="view === 'unpaid' ? 'nothing to pay!' : 'no paid bills yet'" :icon="CircleCheck">
                  {{ view === 'unpaid' ? 'Nothing to pay right now.' : 'Paid bills show up here.' }}
                </DlEmptyState>
              </DlCard>
              <DlCard v-else-if="bills.length" padding="4px 16px">
                <button v-for="(b, i) in bills" :key="b.id" type="button" class="row-btn" :class="{ divider: i > 0 }" data-dl-focus @click="openBill = b">
                  <DlIconTile :icon="Receipt" />
                  <span class="row-text">
                    <span class="row-title">{{ b.kind_label }} · {{ peso(b.total_centavos) }}</span>
                    <span class="row-mono">{{ b.number }} · {{ b.property_name }}</span>
                    <span class="row-line">
                      Due {{ manilaDate(b.due_on).format('MMM D, YYYY') }}<template v-if="b.status !== 'paid'"> · <strong>{{ peso(b.balance_centavos) }} to pay</strong></template>
                    </span>
                  </span>
                  <span class="row-tags">
                    <DlStatusTag :tone="toneOf(billStatus(b).color)">{{ billStatus(b).label }}</DlStatusTag>
                    <DlStatusTag v-if="b.is_late" tone="danger">Late</DlStatusTag>
                    <DlStatusTag v-if="b.under_review" tone="info">Being checked</DlStatusTag>
                  </span>
                </button>
              </DlCard>
            </template>

            <!-- Payments -->
            <template v-else>
              <DlCard v-if="!payments.length">
                <DlEmptyState note="no payments yet" :icon="Wallet">Payments you make or report show up here.</DlEmptyState>
              </DlCard>
              <DlCard v-else padding="4px 16px">
                <div v-for="(p, i) in payments" :key="p.id" class="payment" :class="{ divider: i > 0 }">
                  <div class="pay-head">
                    <span class="row-text">
                      <span class="row-title">{{ peso(p.amount_centavos) }}</span>
                      <span class="row-mono">{{ p.property_name }} · {{ p.method_label }} · {{ manilaDate(p.paid_on).format('D MMM YYYY') }}</span>
                    </span>
                    <DlStatusTag :tone="toneOf(paymentColor[p.status])">{{ p.status_label }}</DlStatusTag>
                  </div>
                  <p v-if="p.receipt_number" class="row-line">Receipt {{ p.receipt_number }}</p>
                  <p v-if="p.reference" class="row-line">Ref {{ p.reference }}</p>
                  <p v-if="p.reject_reason" class="row-line danger">Not confirmed: {{ p.reject_reason }}</p>
                  <p v-if="p.reversal" class="row-line danger">Reversed: {{ p.reversal.reason }}</p>
                  <ion-button v-if="p.receipt_number" size="small" class="dl-tonal" @click="receipt(p)">Receipt (PDF)</ion-button>
                </div>
              </DlCard>
            </template>

            <ion-button v-if="page < lastPage" expand="block" fill="clear" @click="load(false)">Show more</ion-button>
          </div>
        </div>
      </div>

      <report-payment-modal :open="reporting" :places="places" @close="reporting = false" @done="reported" />
      <bill-modal :bill="openBill" :can-correct="false" @close="openBill = null" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { ChartColumn, CircleCheck, Landmark, Receipt, Smartphone, Wallet } from 'lucide-vue-next'
import { ref } from 'vue'
import NotificationBell from '@/components/NotificationBell.vue'
import BillModal from '@/components/billing/BillModal.vue'
import { DlCard, DlEmptyState, DlIconTile, DlListRow, DlRefresher, DlSkeleton, DlStatusTag } from '@/components/dl'
import ReportPaymentModal from '@/components/billing/ReportPaymentModal.vue'
import { billStatus, paymentColor } from '@/lib/billing'
import { manilaDate } from '@/lib/dayjs'
import { openDocument } from '@/lib/documents'
import { peso } from '@/lib/money'
import { toneOf } from '@/lib/tones'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { useToast } from '@/composables/useToast'
import type { Bill, MyPlace, Payment, RoomShares } from '@/types/billing'

const toast = useToast()
const view = ref('unpaid')
const places = ref<MyPlace[]>([])
const roomShares = ref<RoomShares[]>([])
const bills = ref<Bill[]>([])
const payments = ref<Payment[]>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(true)
const reporting = ref(false)
const openBill = ref<Bill | null>(null)

async function load(reset = true) {
  if (reset) loading.value = true
  const next = reset ? 1 : page.value + 1
  try {
    if (view.value === 'payments') {
      const { items, meta } = await billingService.myPayments(next)
      payments.value = reset ? items : [...payments.value, ...items]
      page.value = meta.current_page
      lastPage.value = meta.last_page
    } else {
      const { items, meta } = await billingService.myBills({ status: view.value as 'unpaid' | 'paid', page: next })
      bills.value = reset ? items : [...bills.value, ...items]
      places.value = meta.places
      roomShares.value = meta.room_shares ?? []
      page.value = meta.current_page
      lastPage.value = meta.last_page
    }
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

/** The places card shows on every view, so payments need it loaded too. */
async function loadPlaces() {
  try {
    const { meta } = await billingService.myBills({ status: 'unpaid' })
    places.value = meta.places
    roomShares.value = meta.room_shares ?? []
  } catch {
    /* the list shows its own error */
  }
}

onIonViewWillEnter(() => load())

function switchView(next: string) {
  view.value = next
  load()
  if (next === 'payments') loadPlaces()
}

async function statement(p: MyPlace) {
  try {
    await openDocument(() => billingService.myStatementLink(p.property_id))
  } catch (e) {
    toast.error(firstError(e))
  }
}

async function receipt(p: Payment) {
  try {
    await openDocument(() => billingService.receiptLink(p.id))
  } catch (e) {
    toast.error(firstError(e))
  }
}

function reported(message: string) {
  reporting.value = false
  toast.success(message)
  switchView('payments')
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: var(--card-gap);
}
.page > ion-button {
  margin: 0;
}
.place {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.eyebrow {
  color: inherit;
  opacity: 0.8;
}
.big {
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 34px;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.soft {
  margin: 0;
  color: inherit;
  opacity: 0.85;
}
.how {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid rgb(255 255 255 / 0.15);
}
.pay-line {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}
.statement {
  align-self: flex-start;
  margin: 6px 0 0;
}
.skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.skeleton-lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}
/* List rows (bills, payments) */
.row-btn {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 14px 0;
  border: 0;
  background: none;
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.row-btn:active {
  opacity: 0.7;
}
.divider {
  border-top: 1px solid var(--border-default);
}
.row-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.row-title {
  font-size: 15px;
  font-weight: 700;
}
.row-mono {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.row-line {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}
.row-line.danger {
  color: var(--danger-text);
}
.row-tags {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}
.payment {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 0;
}
.payment ion-button {
  margin: 6px 0 0;
}
.pay-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
}
.shares {
  list-style: none;
  margin: 8px 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.shares li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.share-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.share-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
