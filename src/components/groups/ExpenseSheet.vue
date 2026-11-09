<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ line ? 'Edit shared bill' : 'Add a shared bill' }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <ion-segment v-if="!line && group.can_manage" :value="kind" class="kind" @ion-change="kind = String($event.detail.value) as Kind">
          <ion-segment-button value="paid"><ion-label>Already paid</ion-label></ion-segment-button>
          <ion-segment-button value="collect"><ion-label>Due later</ion-label></ion-segment-button>
        </ion-segment>
        <p v-if="!line && kind === 'paid'" class="muted small">
          Something already paid for the room, e.g. water refills or cleaning things. The others see their share and pay back whoever paid.
        </p>
        <p v-else-if="!line" class="muted small">
          A bill due later, e.g. the internet. Everyone sees their share now and pays the collector before it is due, so nobody pays it all first.
        </p>
        <ion-input v-model="description" label="What for" label-placement="stacked" fill="outline" :maxlength="160" placeholder="e.g. Internet, November" />
        <div class="row">
          <ion-input v-model="amount" inputmode="decimal" label="Amount (₱)" label-placement="stacked" fill="outline" />
          <ion-input v-if="kind === 'collect'" v-model="dueOn" type="date" :min="today" label="Due on" label-placement="stacked" fill="outline" />
          <ion-input v-else v-model="spentOn" type="date" :max="today" label="Paid on" label-placement="stacked" fill="outline" />
        </div>

        <ion-select
          v-if="!line && group.can_manage"
          v-model="paidBy"
          :label="kind === 'collect' ? 'Who collects and pays it' : 'Paid by'"
          label-placement="stacked"
          fill="outline"
          interface="popover"
          class="gap"
        >
          <ion-select-option v-for="m in current" :key="m.id" :value="m.id">{{ m.name }}<template v-if="m.is_me"> (me)</template></ion-select-option>
        </ion-select>

        <h3>Who shares it</h3>
        <ion-list lines="none">
          <ion-item v-for="m in current" :key="m.id">
            <ion-checkbox :checked="chosen.includes(m.id)" label-placement="end" justify="start" @ion-change="toggle(m.id, $event.detail.checked)">{{ m.name }}</ion-checkbox>
            <ion-input
              v-if="method !== 'equal' && chosen.includes(m.id)"
              slot="end"
              v-model="values[m.id]"
              inputmode="decimal"
              :aria-label="method === 'weights' ? `Weight for ${m.name}` : `Amount for ${m.name}`"
              :placeholder="method === 'weights' ? '1' : '₱'"
              class="value"
            />
          </ion-item>
        </ion-list>

        <ion-segment :value="method" @ion-change="method = String($event.detail.value) as Method">
          <ion-segment-button value="equal"><ion-label>Equal</ion-label></ion-segment-button>
          <ion-segment-button value="weights"><ion-label>By weight</ion-label></ion-segment-button>
          <ion-segment-button value="custom"><ion-label>Fixed amounts</ion-label></ion-segment-button>
        </ion-segment>
        <p v-if="method === 'custom'" class="small" :class="{ warn: customGap !== 0 }">
          {{ customGap === 0 ? 'The amounts add up.' : `${peso(Math.abs(customGap))} ${customGap > 0 ? 'still to give out' : 'too much'}.` }}
        </p>
        <p v-else-if="method === 'weights'" class="muted small">E.g. 1 for most, 0.5 for someone who was away half the time.</p>

        <template v-if="!line && kind === 'paid'">
          <p class="muted small gap">Receipt or screenshot (optional, only the room sees it).</p>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden @change="pickFile" />
          <ion-button size="small" fill="outline" @click="openFilePicker(fileInput)">{{ proof ? 'Change file' : 'Attach proof' }}</ion-button>
          <span v-if="proof" class="muted small"> {{ proof.name }}</span>
        </template>

        <ion-button expand="block" class="form-actions" :disabled="busy" @click="save">
          {{ line ? 'Save' : kind === 'collect' ? 'Start collecting' : 'Add bill' }}
        </ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { openFilePicker } from '@/lib/permissions'
import {
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, reactive, ref, watch } from 'vue'
import { manila } from '@/lib/dayjs'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { firstError } from '@/services/api'
import { groupService } from '@/services/groups'
import { useToast } from '@/composables/useToast'
import type { ExpenseInput, Group, GroupLine } from '@/types/groups'

type Method = 'equal' | 'weights' | 'custom'
type Kind = 'paid' | 'collect'

const props = defineProps<{ open: boolean; group: Group; line?: GroupLine | null }>()
const emit = defineEmits<{ close: []; done: [message: string] }>()

const toast = useToast()
const today = manila().format('YYYY-MM-DD')
const current = computed(() => props.group.members.filter((m) => !m.left_on))
const description = ref('')
const amount = ref('')
const spentOn = ref(today)
const dueOn = ref(today)
const kind = ref<Kind>('paid')
const paidBy = ref<number | null>(null)
const chosen = ref<number[]>([])
const method = ref<Method>('equal')
const values = reactive<Record<number, string>>({})
const proof = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)

/** Fixed amounts: what is left to give out (0 = they add up). */
const customGap = computed(() => (toCentavos(amount.value) ?? 0) - chosen.value.reduce((sum, id) => sum + (toCentavos(values[id]) ?? 0), 0))

function reset() {
  const l = props.line
  description.value = l?.description ?? ''
  amount.value = l ? toPesoInput(l.amount_centavos) : ''
  spentOn.value = l?.spent_on ?? today
  kind.value = l?.kind === 'collection' ? 'collect' : 'paid'
  dueOn.value = l?.due_on ?? manila().add(7, 'day').format('YYYY-MM-DD')
  paidBy.value = props.group.me?.id ?? null
  chosen.value = l?.shares?.map((s) => s.member_id) ?? current.value.map((m) => m.id)
  method.value = (['weights', 'custom'].includes(l?.split_method ?? '') ? l!.split_method : 'equal') as Method
  Object.keys(values).forEach((k) => delete values[Number(k)])
  if (l && method.value === 'custom') l.shares?.forEach((s) => (values[s.member_id] = toPesoInput(s.amount_centavos)))
  proof.value = null
}

watch(() => props.open, (open) => open && reset())

function toggle(id: number, on: boolean) {
  chosen.value = on ? [...chosen.value, id] : chosen.value.filter((x) => x !== id)
}

function pickFile(e: Event) {
  proof.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function save() {
  const centavos = toCentavos(amount.value)
  if (!description.value.trim()) return toast.error('Say what it was for.')
  if (!centavos) return toast.error('Enter the amount in pesos.')
  if (!chosen.value.length) return toast.error('Choose who shares it.')
  if (method.value === 'custom' && customGap.value !== 0) return toast.error('The amounts must add up to the total.')

  const input: ExpenseInput = {
    description: description.value.trim(),
    amount_centavos: centavos,
    ...(kind.value === 'collect' ? { due_on: dueOn.value } : { spent_on: spentOn.value }),
    participants: chosen.value,
    method: method.value,
  }
  if (method.value === 'weights') input.weights = Object.fromEntries(chosen.value.map((id) => [id, Number(values[id] || 1)]))
  if (method.value === 'custom') input.amounts = Object.fromEntries(chosen.value.map((id) => [id, toCentavos(values[id]) ?? 0]))
  if (!props.line && paidBy.value && paidBy.value !== props.group.me?.id) input.paid_by_member_id = paidBy.value
  if (!props.line && kind.value === 'paid') input.proof = proof.value

  busy.value = true
  try {
    const { message } = props.line
      ? await groupService.editExpense(props.group.id, props.line.id, input)
      : await groupService.addExpense(props.group.id, input)
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
.kind {
  margin-bottom: 8px;
}
.small {
  font-size: 0.85rem;
}
.value {
  max-width: 90px;
}
.warn {
  color: var(--ion-color-danger);
}
</style>
