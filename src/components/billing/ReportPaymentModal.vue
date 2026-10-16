<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>I paid</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p class="muted small">
          Tell the owner about a payment you sent. It is marked "Waiting for confirmation" until the owner or a caretaker checks it, then you get a receipt.
        </p>
        <ion-select v-if="places.length > 1" v-model="propertyId" label="Paid to" label-placement="stacked" fill="outline" interface="popover">
          <ion-select-option v-for="p in places" :key="p.property_id" :value="p.property_id">{{ p.property_name }}</ion-select-option>
        </ion-select>
        <p v-else-if="places[0]"><strong>{{ places[0].property_name }}</strong></p>

        <div class="row">
          <ion-input v-model="amount" inputmode="decimal" label="Amount (₱)" label-placement="stacked" fill="outline" />
          <ion-input v-model="paidOn" type="date" :max="today" label="Paid on" label-placement="stacked" fill="outline" />
        </div>
        <ion-select v-model="method" label="How you paid" label-placement="stacked" fill="outline" interface="popover" class="gap">
          <ion-select-option v-for="(label, value) in PaymentMethodLabels" :key="value" :value="value">{{ label }}</ion-select-option>
        </ion-select>
        <ion-input v-model="reference" label="Reference no." label-placement="stacked" fill="outline" class="gap" :maxlength="100" placeholder="From the GCash, Maya or bank receipt" />

        <p class="muted small gap">Screenshot of the payment. You need a reference no. or a screenshot.</p>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden @change="pickFile" />
        <ion-button size="small" fill="outline" @click="fileInput?.click()">{{ proof ? 'Change file' : 'Attach screenshot' }}</ion-button>
        <span v-if="proof" class="muted small"> {{ proof.name }}</span>

        <ion-input v-model="note" label="Note (optional)" label-placement="stacked" fill="outline" class="gap" :maxlength="255" placeholder="e.g. For my October rent" />
        <ion-button expand="block" class="form-actions" :disabled="busy || !propertyId" @click="send">Send to the owner</ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/vue'
import { ref, watch } from 'vue'
import { manila } from '@/lib/dayjs'
import { toCentavos, toPesoInput } from '@/lib/money'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { useToast } from '@/composables/useToast'
import { PaymentMethodLabels, type PaymentMethod } from '@/types/enums'
import type { MyPlace } from '@/types/billing'

const props = defineProps<{ open: boolean; places: MyPlace[] }>()
const emit = defineEmits<{ close: []; done: [message: string] }>()

const toast = useToast()
const today = manila().format('YYYY-MM-DD')
const propertyId = ref<number | null>(null)
const amount = ref('')
const paidOn = ref(today)
const method = ref<PaymentMethod>('e_wallet')
const reference = ref('')
const note = ref('')
const proof = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)

/** Start from the place that has something owed, and that amount. */
function reset() {
  const owing = props.places.find((p) => p.owed_centavos > 0) ?? props.places[0]
  propertyId.value = owing?.property_id ?? null
  amount.value = owing?.owed_centavos ? toPesoInput(owing.owed_centavos) : ''
  paidOn.value = today
  method.value = 'e_wallet'
  reference.value = ''
  note.value = ''
  proof.value = null
}

watch(() => props.open, (open) => open && reset())

function pickFile(e: Event) {
  proof.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function send() {
  const centavos = toCentavos(amount.value)
  if (!propertyId.value) return
  if (!centavos) return toast.error('Enter the amount in pesos, e.g. 1800.')
  if (!reference.value.trim() && !proof.value) return toast.error('Enter the reference no. or attach a screenshot.')
  busy.value = true
  try {
    const { message } = await billingService.report(propertyId.value, {
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
</style>
