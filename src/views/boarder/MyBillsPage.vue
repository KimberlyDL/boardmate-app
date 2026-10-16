<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>My bills</ion-title>
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
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <p v-if="!loading && !places.length" class="muted center">You have no bills. They start after you move in somewhere.</p>

        <!-- Each place: what is owed, and how to pay -->
        <ion-card v-for="p in places" :key="p.property_id">
          <ion-card-header>
            <ion-card-subtitle>{{ p.property_name }}</ion-card-subtitle>
            <ion-card-title>{{ p.owed_centavos > 0 ? `You owe ${peso(p.owed_centavos)}` : 'All paid' }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p v-if="p.credit_centavos">You have {{ peso(p.credit_centavos) }} credit. It is used on your next bills.</p>
            <template v-if="p.pay_to">
              <p class="label">How to pay</p>
              <p v-if="p.pay_to.gcash_number">GCash {{ p.pay_to.gcash_number }}<template v-if="p.pay_to.gcash_name"> ({{ p.pay_to.gcash_name }})</template></p>
              <p v-if="p.pay_to.bank_account_number">
                {{ p.pay_to.bank_name ?? 'Bank' }} {{ p.pay_to.bank_account_number }}<template v-if="p.pay_to.bank_account_name"> ({{ p.pay_to.bank_account_name }})</template>
              </p>
            </template>
            <p v-else class="muted small">Ask the owner how to pay, or pay in cash and get a receipt.</p>
            <ion-button size="small" fill="outline" @click="statement(p)">Statement (PDF)</ion-button>
          </ion-card-content>
        </ion-card>

        <ion-button v-if="places.length" expand="block" @click="reporting = true">I paid: tell the owner</ion-button>

        <p v-if="loading" class="muted">Loading…</p>

        <!-- Bills -->
        <template v-else-if="view !== 'payments'">
          <p v-if="places.length && !bills.length" class="muted center">{{ view === 'unpaid' ? 'Nothing to pay right now.' : 'No paid bills yet.' }}</p>
          <ion-card v-for="b in bills" :key="b.id" button @click="openBill = b">
            <ion-card-header>
              <ion-card-subtitle>{{ b.number }} · {{ b.property_name }}</ion-card-subtitle>
              <ion-card-title>{{ b.kind_label }} · {{ peso(b.total_centavos) }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>
                Due {{ manilaDate(b.due_on).format('MMM D, YYYY') }}
                <template v-if="b.status !== 'paid'"> · <strong>{{ peso(b.balance_centavos) }} to pay</strong></template>
              </p>
              <ion-badge :color="billStatus(b).color">{{ billStatus(b).label }}</ion-badge>
              <ion-badge v-if="b.is_late" color="danger" class="gap-left">Late</ion-badge>
              <ion-badge v-if="b.under_review" color="tertiary" class="gap-left">Being checked</ion-badge>
            </ion-card-content>
          </ion-card>
        </template>

        <!-- Payments -->
        <template v-else>
          <p v-if="!payments.length" class="muted center">No payments yet.</p>
          <ion-card v-for="p in payments" :key="p.id">
            <ion-card-header>
              <ion-card-subtitle>{{ p.property_name }} · {{ p.method_label }} · {{ manilaDate(p.paid_on).format('MMM D, YYYY') }}</ion-card-subtitle>
              <ion-card-title>{{ peso(p.amount_centavos) }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p v-if="p.receipt_number">Receipt {{ p.receipt_number }}</p>
              <p v-if="p.reference">Ref {{ p.reference }}</p>
              <p v-if="p.reject_reason">Not confirmed: {{ p.reject_reason }}</p>
              <p v-if="p.reversal">Reversed: {{ p.reversal.reason }}</p>
              <ion-badge :color="paymentColor[p.status]">{{ p.status_label }}</ion-badge>
              <ion-button v-if="p.receipt_number" size="small" fill="outline" class="gap-left" @click="receipt(p)">Receipt (PDF)</ion-button>
            </ion-card-content>
          </ion-card>
        </template>

        <ion-button v-if="page < lastPage" expand="block" fill="clear" @click="load(false)">Show more</ion-button>
      </div>

      <report-payment-modal :open="reporting" :places="places" @close="reporting = false" @done="reported" />
      <bill-modal :bill="openBill" :can-correct="false" @close="openBill = null" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonBadge,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonLabel,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { ref } from 'vue'
import BillModal from '@/components/billing/BillModal.vue'
import ReportPaymentModal from '@/components/billing/ReportPaymentModal.vue'
import { billStatus, paymentColor } from '@/lib/billing'
import { manilaDate } from '@/lib/dayjs'
import { openDocument } from '@/lib/documents'
import { peso } from '@/lib/money'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { useToast } from '@/composables/useToast'
import type { Bill, MyPlace, Payment } from '@/types/billing'

const toast = useToast()
const view = ref('unpaid')
const places = ref<MyPlace[]>([])
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
    places.value = (await billingService.myBills({ status: 'unpaid' })).meta.places
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

async function refresh(e: RefresherCustomEvent) {
  await load()
  e.target.complete()
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
.label {
  font-weight: 600;
  margin-top: 8px;
}
.small {
  font-size: 0.85rem;
}
.gap-left {
  margin-left: 4px;
}
</style>
