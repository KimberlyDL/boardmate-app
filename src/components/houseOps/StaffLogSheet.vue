<template>
  <ion-modal :is-open="mode !== null" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ mode === 'walk_in' ? 'Log a walk-in visitor' : 'Log a late arrival' }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p v-if="!tenants.length" class="muted">Nobody stays here right now.</p>
        <template v-else>
          <ion-select v-model="tenancyId" :label="mode === 'walk_in' ? 'Visiting' : 'Who'" label-placement="stacked" fill="outline" interface="popover">
            <ion-select-option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }} · {{ t.where }}</ion-select-option>
          </ion-select>

          <template v-if="mode === 'walk_in'">
            <ion-input v-model="name" label="Visitor's name" label-placement="stacked" fill="outline" class="gap" :maxlength="120" />
            <ion-input v-model="contact" label="Contact (optional)" label-placement="stacked" fill="outline" class="gap" :maxlength="50" />
            <ion-item lines="none" class="gap">
              <ion-toggle :checked="overnight" @ion-change="overnight = $event.detail.checked">Stays overnight</ion-toggle>
            </ion-item>
            <ion-input v-if="overnight" v-model="nights" type="number" inputmode="numeric" :min="1" :max="7" label="Nights" label-placement="stacked" fill="outline" />
            <p class="muted small">They are checked in now. Check them out when they leave.</p>
          </template>

          <template v-else>
            <div class="row">
              <ion-input v-model="onDate" type="date" :min="earliest" :max="today" label="Night" label-placement="stacked" fill="outline" />
              <ion-input v-model="arrivedAt" type="time" label="Arrived (optional)" label-placement="stacked" fill="outline" />
            </div>
            <ion-textarea v-model="note" label="Note (optional)" label-placement="stacked" fill="outline" class="gap" :rows="2" :auto-grow="true" :maxlength="500" />
            <p class="muted small">A record only. No fee is added; the owner sees repeated late arrivals.</p>
          </template>

          <ion-button expand="block" class="form-actions" :disabled="busy" @click="save">Log it</ion-button>
        </template>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonModal, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToggle, IonToolbar } from '@ionic/vue'
import { ref, watch } from 'vue'
import { manila } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { houseOpsService } from '@/services/houseOps'
import { useToast } from '@/composables/useToast'

/** Staff log a walk-in visitor (D4) or a late arrival without an approved request (D2). */
const props = defineProps<{ mode: 'walk_in' | 'violation' | null; propertyId: number; tenants: { id: number; name: string; where: string }[] }>()
const emit = defineEmits<{ close: []; done: [message: string] }>()

const toast = useToast()
const today = manila().format('YYYY-MM-DD')
const earliest = manila().subtract(7, 'day').format('YYYY-MM-DD')
const tenancyId = ref<number | null>(null)
const name = ref('')
const contact = ref('')
const overnight = ref(false)
const nights = ref('1')
const onDate = ref(today)
const arrivedAt = ref('')
const note = ref('')
const busy = ref(false)

watch(() => props.mode, (mode) => {
  if (!mode) return
  tenancyId.value = props.tenants[0]?.id ?? null
  name.value = contact.value = arrivedAt.value = note.value = ''
  overnight.value = false
  nights.value = '1'
  // A late arrival is usually logged the morning after.
  onDate.value = manila().hour() < 12 ? manila().subtract(1, 'day').format('YYYY-MM-DD') : today
})

async function save() {
  if (!tenancyId.value) return toast.error('Choose who.')
  if (props.mode === 'walk_in' && !name.value.trim()) return toast.error("Enter the visitor's name.")
  busy.value = true
  try {
    const { message } = props.mode === 'walk_in'
      ? await houseOpsService.logWalkIn(props.propertyId, {
          tenancy_id: tenancyId.value,
          name: name.value.trim(),
          contact: contact.value.trim() || null,
          overnight: overnight.value,
          nights: overnight.value ? Number(nights.value) || 1 : null,
        })
      : await houseOpsService.logViolation(props.propertyId, { tenancy_id: tenancyId.value, on_date: onDate.value, arrived_at: arrivedAt.value || null, note: note.value.trim() || null })
    emit('done', message)
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
