<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Record a payment</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <ion-select v-model="payerId" label="Who paid" label-placement="stacked" fill="outline" interface="popover" @ion-change="loadBalance">
          <ion-select-option v-for="p in payers" :key="p.id" :value="p.id">{{ p.name }} · Room {{ p.room_label }}</ion-select-option>
        </ion-select>
        <p v-if="!payers.length" class="muted">Nobody lives here now.</p>

        <ion-card v-if="balance" class="owed">
          <ion-card-content>
            <div class="line"><strong>Owes now</strong><strong>{{ peso(balance.owed_centavos) }}</strong></div>
            <div v-if="balance.credit_centavos" class="line"><span>Credit held</span><span>{{ peso(balance.credit_centavos) }}</span></div>
            <div v-for="b in balance.bills" :key="b.id" class="line small">
              <span>{{ b.number }} · due {{ manilaDate(b.due_on).format('MMM D') }}<template v-if="b.is_overdue"> (overdue)</template></span>
              <span>{{ peso(b.balance_centavos) }}</span>
            </div>
            <p v-if="!balance.bills.length" class="muted small">No unpaid bills. Money received now is kept as credit for the next bills.</p>
          </ion-card-content>
        </ion-card>

        <div class="row">
          <ion-input v-model="amount" inputmode="decimal" label="Amount (₱)" label-placement="stacked" fill="outline" />
          <ion-input v-model="paidOn" type="date" :max="today" label="Paid on" label-placement="stacked" fill="outline" />
        </div>
        <ion-select v-model="method" label="Method" label-placement="stacked" fill="outline" interface="popover" class="gap">
          <ion-select-option v-for="(label, value) in PaymentMethodLabels" :key="value" :value="value">{{ label }}</ion-select-option>
        </ion-select>
        <ion-input v-model="reference" label="Reference no. (optional)" label-placement="stacked" fill="outline" class="gap" :maxlength="100" />
        <ion-input v-model="note" label="Note (optional)" label-placement="stacked" fill="outline" class="gap" :maxlength="255" />

        <p class="muted small">Proof (optional): a photo or PDF of the receipt or transfer.</p>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden @change="pickFile" />
        <ion-button size="small" fill="outline" @click="fileInput?.click()">{{ proof ? 'Change file' : 'Attach proof' }}</ion-button>
        <span v-if="proof" class="muted small"> {{ proof.name }}</span>

        <p class="muted small gap">It is applied to the oldest bills first (rent, then utilities, then other charges). Extra money is kept as credit. A numbered receipt is issued.</p>
        <ion-button expand="block" class="form-actions" :disabled="busy || !payerId" @click="save">Record payment</ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { ref, watch } from 'vue'
import type { Payer } from '@/lib/billing'
import { manila, manilaDate } from '@/lib/dayjs'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { useToast } from '@/composables/useToast'
import { PaymentMethodLabels, type PaymentMethod } from '@/types/enums'
import type { PayerBalance } from '@/types/billing'

const props = defineProps<{ open: boolean; propertyId: number; payers: Payer[]; presetPayerId?: number | null }>()
const emit = defineEmits<{ close: []; done: [message: string] }>()

const toast = useToast()
const today = manila().format('YYYY-MM-DD')
const payerId = ref<number | null>(null)
const balance = ref<PayerBalance | null>(null)
const amount = ref('')
const paidOn = ref(today)
const method = ref<PaymentMethod>('cash')
const reference = ref('')
const note = ref('')
const proof = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)

function reset() {
  payerId.value = props.presetPayerId ?? null
  balance.value = null
  amount.value = ''
  paidOn.value = today
  method.value = 'cash'
  reference.value = ''
  note.value = ''
  proof.value = null
  if (payerId.value) loadBalance()
}

watch(() => props.open, (open) => open && reset())

async function loadBalance() {
  if (!payerId.value) return
  try {
    balance.value = await billingService.balance(props.propertyId, payerId.value)
    if (!amount.value && balance.value.owed_centavos > 0) amount.value = toPesoInput(balance.value.owed_centavos)
  } catch (e) {
    toast.error(firstError(e))
  }
}

function pickFile(e: Event) {
  proof.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function save() {
  const centavos = toCentavos(amount.value)
  if (!payerId.value) return toast.error('Choose who paid.')
  if (!centavos) return toast.error('Enter the amount in pesos, e.g. 1800.')
  busy.value = true
  try {
    const { message } = await billingService.record(props.propertyId, payerId.value, {
      amount_centavos: centavos,
      method: method.value,
      paid_on: paidOn.value,
      reference: reference.value.trim() || undefined,
      note: note.value.trim() || undefined,
      proof: proof.value,
    })
    emit('done', message)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.gap {
  margin-top: 8px;
}
.small {
  font-size: 0.85rem;
}
.owed .line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}
</style>
