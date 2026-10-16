<template>
  <ion-modal :is-open="account !== null" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Enter the {{ account?.name }} bill</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p class="muted small">
          Type what the provider billed. Each room's share is billed to its room leader, split by the days people stayed. It is due after the number of days set in Settings (7 by default).
        </p>
        <div class="row">
          <ion-input v-model="from" type="date" label="Covers from" label-placement="stacked" fill="outline" @ion-change="stale" />
          <ion-input v-model="to" type="date" :max="today" label="to" label-placement="stacked" fill="outline" @ion-change="stale" />
        </div>
        <ion-input v-model="total" inputmode="decimal" label="Total billed (₱)" label-placement="stacked" fill="outline" class="gap" @ion-input="stale" />
        <ion-button expand="block" fill="outline" class="gap" :disabled="busy" @click="preview">See each room's share</ion-button>

        <template v-if="shares">
          <ion-list lines="full" class="gap">
            <ion-item v-for="s in shares" :key="s.room_id">
              <ion-label class="ion-text-wrap">
                <h3>Room {{ s.room_label }} · {{ peso(s.amount_centavos) }}</h3>
                <p>{{ s.occupant_days }} person-days · {{ s.leader ? `to ${s.leader.name}` : 'no room leader' }}</p>
              </ion-label>
              <ion-toggle slot="end" :checked="waived.includes(s.room_id)" @ion-change="toggleWaive(s.room_id, $event.detail.checked)">Waive</ion-toggle>
            </ion-item>
          </ion-list>
          <p v-if="needsWaiver.length" class="error small">
            Room {{ needsWaiver.map((s) => s.room_label).join(', ') }} has no leader. Appoint one first, or waive its share (you absorb it).
          </p>

          <p class="muted small gap">Photo of the bill (optional, only staff see it).</p>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden @change="pickFile" />
          <ion-button size="small" fill="outline" @click="fileInput?.click()">{{ photo ? 'Change file' : 'Attach photo' }}</ion-button>
          <span v-if="photo" class="muted small"> {{ photo.name }}</span>

          <ion-button expand="block" class="form-actions" :disabled="busy || needsWaiver.length > 0" @click="save">Bill the rooms</ion-button>
        </template>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonModal, IonTitle, IonToggle, IonToolbar } from '@ionic/vue'
import { computed, ref, watch } from 'vue'
import { manila } from '@/lib/dayjs'
import { peso, toCentavos } from '@/lib/money'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { useToast } from '@/composables/useToast'
import type { UtilityBillInput, UtilityShare } from '@/types/billing'
import type { UtilityAccount } from '@/types/property'

const props = defineProps<{ account: UtilityAccount | null; propertyId: number }>()
const emit = defineEmits<{ close: []; done: [message: string] }>()

const toast = useToast()
const today = manila().format('YYYY-MM-DD')
const from = ref('')
const to = ref('')
const total = ref('')
const shares = ref<UtilityShare[] | null>(null)
const waived = ref<number[]>([])
const photo = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)

const needsWaiver = computed(() => (shares.value ?? []).filter((s) => !s.leader && !waived.value.includes(s.room_id)))

function reset() {
  from.value = manila().subtract(1, 'month').format('YYYY-MM-DD')
  to.value = today
  total.value = ''
  shares.value = null
  waived.value = []
  photo.value = null
}

watch(() => props.account?.id, (id) => id && reset())

/** Any change to the dates or total needs a fresh preview. */
const stale = () => (shares.value = null)

function input(): UtilityBillInput | null {
  const centavos = toCentavos(total.value)
  if (!props.account) return null
  if (!centavos) {
    toast.error('Enter the total in pesos.')
    return null
  }
  return {
    utility_account_id: props.account.id,
    coverage_from_on: from.value,
    coverage_to_on: to.value,
    total_centavos: centavos,
    waive_room_ids: waived.value,
    photo: photo.value,
  }
}

async function preview() {
  const body = input()
  if (!body) return
  busy.value = true
  try {
    shares.value = await billingService.previewUtilityBill(props.propertyId, body)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

function toggleWaive(roomId: number, on: boolean) {
  waived.value = on ? [...waived.value, roomId] : waived.value.filter((id) => id !== roomId)
}

function pickFile(e: Event) {
  photo.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function save() {
  const body = input()
  if (!body) return
  busy.value = true
  try {
    const { message } = await billingService.enterUtilityBill(props.propertyId, body)
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
.error {
  color: var(--ion-color-danger);
}
</style>
