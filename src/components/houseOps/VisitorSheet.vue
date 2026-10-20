<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Register a visitor</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <ion-input v-model="name" label="Visitor's name" label-placement="stacked" fill="outline" :maxlength="120" />
        <ion-input v-model="contact" label="Contact (optional)" label-placement="stacked" fill="outline" class="gap" :maxlength="50" />
        <ion-input v-model="visitOn" type="date" :min="today" :max="latest" label="Day" label-placement="stacked" fill="outline" class="gap" />
        <div class="row">
          <ion-input v-model="expectedIn" type="time" label="Arrives (optional)" label-placement="stacked" fill="outline" />
          <ion-input v-if="!overnight" v-model="expectedOut" type="time" label="Leaves (optional)" label-placement="stacked" fill="outline" />
        </div>

        <ion-item lines="none" class="gap">
          <ion-toggle :checked="overnight" @ion-change="overnight = $event.detail.checked">Stays overnight</ion-toggle>
        </ion-item>
        <template v-if="overnight">
          <ion-input v-model="nights" type="number" inputmode="numeric" :min="1" :max="7" label="Nights" label-placement="stacked" fill="outline" />
          <p v-if="nightsInfo" class="muted small">
            {{ nightsInfo.needs_approval ? 'Overnight stays need approval first. ' : '' }}You have used {{ nightsInfo.used }} of {{ nightsInfo.limit }} nights this month.
            <span v-if="overLimit" class="warn">This goes over the limit: you can still ask, and the owner is told.</span>
          </p>
        </template>

        <ion-button expand="block" class="form-actions" :disabled="busy" @click="save">Register</ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonModal, IonTitle, IonToggle, IonToolbar } from '@ionic/vue'
import { computed, ref, watch } from 'vue'
import { manila } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { houseOpsService } from '@/services/houseOps'
import { useToast } from '@/composables/useToast'
import type { NightsUsed, Visitor } from '@/types/houseOps'

/** The tenant registers a visit ahead (D4). */
const props = defineProps<{ open: boolean; tenancyId: number; nightsInfo: NightsUsed | null }>()
const emit = defineEmits<{ close: []; done: [message: string, visitor: Visitor] }>()

const toast = useToast()
const today = manila().format('YYYY-MM-DD')
const latest = manila().add(30, 'day').format('YYYY-MM-DD')
const name = ref('')
const contact = ref('')
const visitOn = ref(today)
const expectedIn = ref('')
const expectedOut = ref('')
const overnight = ref(false)
const nights = ref('1')
const busy = ref(false)

const overLimit = computed(() => !!props.nightsInfo && props.nightsInfo.used + (Number(nights.value) || 1) > props.nightsInfo.limit)

watch(() => props.open, (open) => {
  if (!open) return
  name.value = contact.value = expectedIn.value = expectedOut.value = ''
  visitOn.value = today
  overnight.value = false
  nights.value = '1'
})

async function save() {
  if (!name.value.trim()) return toast.error("Enter the visitor's name.")
  busy.value = true
  try {
    const { item, message } = await houseOpsService.registerVisitor(props.tenancyId, {
      name: name.value.trim(),
      contact: contact.value.trim() || null,
      visit_on: visitOn.value,
      expected_in: expectedIn.value || null,
      expected_out: overnight.value ? null : expectedOut.value || null,
      overnight: overnight.value,
      nights: overnight.value ? Number(nights.value) || 1 : null,
    })
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
  margin-top: 8px;
}
.small {
  font-size: 0.85rem;
}
.warn {
  color: var(--ion-color-danger);
}
</style>
