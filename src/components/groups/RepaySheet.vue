<template>
  <ion-modal :is-open="preset !== null" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Pay back</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="preset" class="narrow">
        <p>
          <strong>{{ preset.fromName }}</strong> → <strong>{{ preset.toName }}</strong> · owes {{ peso(preset.owed) }}
        </p>
        <p class="muted small">{{ selfReceived ? 'You are recording money you got: it counts at once.' : `${preset.toName} confirms it before it counts.` }}</p>
        <div class="row">
          <ion-input v-model="amount" inputmode="decimal" label="Amount (₱)" label-placement="stacked" fill="outline" />
          <ion-select v-model="method" label="How" label-placement="stacked" fill="outline" interface="popover">
            <ion-select-option v-for="(label, value) in RepaymentMethodLabels" :key="value" :value="value">{{ label }}</ion-select-option>
          </ion-select>
        </div>
        <ion-input v-model="reference" label="Reference (optional)" label-placement="stacked" fill="outline" class="gap" :maxlength="100" />
        <ion-input v-model="note" label="Note (optional)" label-placement="stacked" fill="outline" class="gap" :maxlength="255" />
        <p class="muted small gap">Screenshot (optional).</p>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden @change="pickFile" />
        <ion-button size="small" fill="outline" @click="fileInput?.click()">{{ proof ? 'Change file' : 'Attach screenshot' }}</ion-button>
        <span v-if="proof" class="muted small"> {{ proof.name }}</span>
        <ion-button expand="block" class="form-actions" :disabled="busy" @click="save">{{ selfReceived ? 'Record it' : 'Mark as paid' }}</ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { IonButton, IonButtons, IonContent, IonHeader, IonInput, IonModal, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/vue'
import { computed, ref, watch } from 'vue'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { firstError } from '@/services/api'
import { groupService } from '@/services/groups'
import { useToast } from '@/composables/useToast'
import { RepaymentMethodLabels, type RepaymentMethod } from '@/types/enums'

/** Who pays whom and how much is owed; `fromId` differs from me when the leader records for someone. */
export interface RepayPreset {
  fromId: number
  fromName: string
  toId: number
  toName: string
  owed: number
}

const props = defineProps<{ groupId: number; myMemberId: number | null; preset: RepayPreset | null }>()
const emit = defineEmits<{ close: []; done: [message: string] }>()

const toast = useToast()
const amount = ref('')
const method = ref<RepaymentMethod>('cash')
const reference = ref('')
const note = ref('')
const proof = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const selfReceived = computed(() => props.preset?.toId === props.myMemberId)

watch(() => props.preset, (p) => {
  if (!p) return
  amount.value = toPesoInput(p.owed)
  method.value = 'cash'
  reference.value = ''
  note.value = ''
  proof.value = null
})

function pickFile(e: Event) {
  proof.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function save() {
  const p = props.preset!
  const centavos = toCentavos(amount.value)
  if (!centavos) return toast.error('Enter the amount in pesos.')
  if (centavos > p.owed) return toast.error(`${p.fromName} owes ${peso(p.owed)}.`)
  busy.value = true
  try {
    const { message } = await groupService.markRepayment(props.groupId, {
      to_member_id: p.toId,
      from_member_id: p.fromId !== props.myMemberId ? p.fromId : undefined,
      amount_centavos: centavos,
      method: method.value,
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
