<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Add a one-time charge</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p class="muted small">Damage, a lost key, an extra occupant… It becomes its own numbered bill to the tenant.</p>
        <ion-select v-model="tenancyId" label="Tenant" label-placement="stacked" fill="outline" interface="popover">
          <ion-select-option v-for="p in payers" :key="p.tenancy_id" :value="p.tenancy_id">{{ p.name }} · Room {{ p.room_label }}</ion-select-option>
        </ion-select>
        <ion-input v-model="description" label="What it is for" label-placement="stacked" fill="outline" class="gap" :maxlength="160" placeholder="e.g. Lost key" />
        <div class="row">
          <ion-input v-model="amount" inputmode="decimal" label="Amount (₱)" label-placement="stacked" fill="outline" />
          <ion-input v-model="dueOn" type="date" :min="today" label="Due on" label-placement="stacked" fill="outline" />
        </div>
        <ion-input v-model="reason" label="Reason (the tenant sees it)" label-placement="stacked" fill="outline" class="gap" :maxlength="255" />
        <p class="muted small">Leave the due date empty to use the property's utility due days.</p>
        <ion-button expand="block" class="form-actions" :disabled="busy" @click="save">Add charge</ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/vue'
import { ref, watch } from 'vue'
import type { Payer } from '@/lib/billing'
import { manila } from '@/lib/dayjs'
import { toCentavos } from '@/lib/money'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ open: boolean; propertyId: number; payers: Payer[] }>()
const emit = defineEmits<{ close: []; done: [message: string] }>()

const toast = useToast()
const today = manila().format('YYYY-MM-DD')
const tenancyId = ref<number | null>(null)
const description = ref('')
const amount = ref('')
const dueOn = ref('')
const reason = ref('')
const busy = ref(false)

function reset() {
  tenancyId.value = null
  description.value = ''
  amount.value = ''
  dueOn.value = ''
  reason.value = ''
}

watch(() => props.open, (open) => open && reset())

async function save() {
  const centavos = toCentavos(amount.value)
  if (!tenancyId.value) return toast.error('Choose the tenant.')
  if (!description.value.trim()) return toast.error('Say what the charge is for.')
  if (!centavos) return toast.error('Enter the amount in pesos.')
  if (!reason.value.trim()) return toast.error('Give a reason. The tenant sees it.')
  busy.value = true
  try {
    const { message } = await billingService.addCharge(props.propertyId, {
      tenancy_id: tenancyId.value,
      amount_centavos: centavos,
      description: description.value.trim(),
      reason: reason.value.trim(),
      due_on: dueOn.value || undefined,
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
