<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Coming back late</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p class="muted small">The curfew is {{ curfew }}. Ask ahead; you are told when the owner or caretaker decides.</p>
        <div class="row">
          <ion-input v-model="onDate" type="date" :min="today" :max="latest" label="Night" label-placement="stacked" fill="outline" />
          <ion-input v-model="arrival" type="time" label="I expect to arrive" label-placement="stacked" fill="outline" />
        </div>
        <ion-textarea v-model="reason" label="Why" label-placement="stacked" fill="outline" class="gap" :rows="3" :auto-grow="true" :maxlength="500" placeholder="e.g. Group project at school until 11 PM." />
        <ion-button expand="block" class="form-actions" :disabled="busy" @click="save">Send request</ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonTextarea, IonTitle, IonToolbar } from '@ionic/vue'
import { ref, watch } from 'vue'
import { manila } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { houseOpsService } from '@/services/houseOps'
import { useToast } from '@/composables/useToast'
import type { LateEntry } from '@/types/houseOps'

/** The tenant asks ahead to come back after curfew (D2): today up to 7 days ahead. */
const props = defineProps<{ open: boolean; tenancyId: number; curfew: string }>()
const emit = defineEmits<{ close: []; done: [message: string, entry: LateEntry] }>()

const toast = useToast()
const today = manila().format('YYYY-MM-DD')
const latest = manila().add(7, 'day').format('YYYY-MM-DD')
const onDate = ref(today)
const arrival = ref('')
const reason = ref('')
const busy = ref(false)

watch(() => props.open, (open) => {
  if (!open) return
  onDate.value = today
  arrival.value = ''
  reason.value = ''
})

async function save() {
  if (!arrival.value) return toast.error('Say when you expect to arrive.')
  if (!reason.value.trim()) return toast.error('Give a reason.')
  busy.value = true
  try {
    const { item, message } = await houseOpsService.askLate(props.tenancyId, { on_date: onDate.value, expected_arrival: arrival.value, reason: reason.value.trim() })
    emit('done', message, item)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.gap {
  margin-top: 8px;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.small {
  font-size: 0.85rem;
}
</style>
