<template>
  <ion-modal :is-open="line !== null" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ line?.kind_label }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="line" class="narrow">
        <p>
          <strong>{{ line.description }}</strong><br />
          {{ peso(line.amount_centavos) }} · paid by {{ line.paid_by.name }} · {{ manilaDate(line.spent_on).format('MMM D, YYYY') }}
        </p>
        <ion-badge v-if="line.is_locked" color="medium">Owner bill: the amount is fixed</ion-badge>
        <p v-if="line.reason" class="muted small">{{ line.reason }}</p>
        <a v-if="line.proof_url" :href="line.proof_url" target="_blank" rel="noopener" class="link">See proof</a>

        <template v-if="line.shares">
          <h3>Shares <span class="muted small">({{ line.split_label }})</span></h3>
          <ion-list lines="full">
            <ion-item v-for="s in line.shares" :key="s.member_id">
              <ion-label>{{ s.name }}</ion-label>
              <ion-note slot="end">{{ peso(s.amount_centavos) }}</ion-note>
            </ion-item>
          </ion-list>
        </template>

        <div v-if="line.kind !== 'adjustment'" class="actions">
          <ion-button v-if="group.can_manage" size="small" fill="outline" @click="mode = 'split'">Change split</ion-button>
          <ion-button v-if="canEdit" size="small" fill="outline" @click="emit('edit', line)">Edit</ion-button>
          <ion-button v-if="canEdit" size="small" fill="clear" color="danger" :disabled="busy" @click="remove">Delete</ion-button>
          <ion-button v-if="group.can_manage" size="small" fill="clear" @click="mode = 'correct'">Add a correction</ion-button>
        </div>

        <!-- Change split: per member, weights or fixed amounts, or equal / by days -->
        <ion-card v-if="mode === 'split'">
          <ion-card-content>
            <ion-select v-model="splitMethod" label="Split" label-placement="stacked" fill="outline" interface="popover">
              <ion-select-option value="equal">Equal</ion-select-option>
              <ion-select-option v-if="line.is_locked" value="occupant_days">By days stayed</ion-select-option>
              <ion-select-option value="weights">By weight</ion-select-option>
              <ion-select-option value="custom">Fixed amounts</ion-select-option>
            </ion-select>
            <template v-if="splitMethod === 'weights' || splitMethod === 'custom'">
              <ion-input
                v-for="m in shareMembers"
                :key="m.id"
                v-model="numbers[m.id]"
                inputmode="decimal"
                :label="m.name"
                label-placement="start"
                fill="outline"
                class="gap"
                :placeholder="splitMethod === 'weights' ? '1' : '₱'"
              />
            </template>
            <p class="muted small">Only until someone has paid back for this; after that, add a correction.</p>
            <ion-button size="small" :disabled="busy" @click="saveSplit">Save split</ion-button>
            <ion-button size="small" fill="clear" color="medium" @click="mode = null">Cancel</ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Correction: who gains (+) or loses (−) -->
        <ion-card v-if="mode === 'correct'">
          <ion-card-content>
            <p class="muted small">
              Type + if someone should owe more, − if less (e.g. −150 for someone away half the month).
              <template v-if="line.is_locked">An owner bill's total is fixed, so the changes must add up to ₱0.</template>
            </p>
            <ion-input
              v-for="m in shareMembers"
              :key="m.id"
              v-model="changes[m.id]"
              inputmode="decimal"
              :label="m.name"
              label-placement="start"
              fill="outline"
              class="gap"
              placeholder="0"
            />
            <p class="small" :class="{ warn: line.is_locked && changesTotal !== 0 }">Total change: {{ peso(changesTotal) }}</p>
            <ion-input v-model="reason" label="Reason" label-placement="stacked" fill="outline" class="gap" :maxlength="255" />
            <ion-button size="small" :disabled="busy" @click="saveCorrection">Add correction</ion-button>
            <ion-button size="small" fill="clear" color="medium" @click="mode = null">Cancel</ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, reactive, ref, watch } from 'vue'
import { manilaDate } from '@/lib/dayjs'
import { peso, toCentavos } from '@/lib/money'
import { firstError } from '@/services/api'
import { groupService } from '@/services/groups'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Group, GroupLine } from '@/types/groups'

const props = defineProps<{ line: GroupLine | null; group: Group }>()
const emit = defineEmits<{ close: []; changed: [message: string]; edit: [line: GroupLine] }>()

const toast = useToast()
const prompt = usePrompt()
const busy = ref(false)
const mode = ref<'split' | 'correct' | null>(null)
const splitMethod = ref('equal')
const numbers = reactive<Record<number, string>>({})
const changes = reactive<Record<number, string>>({})
const reason = ref('')

/** A member's own expense: the leader, a moderator or whoever added it may edit it. */
const canEdit = computed(() => props.line?.kind === 'member_expense' && props.group.me?.is_current && (props.group.can_manage || props.line.added_by_me))
/** Everyone in the room (current and former), for splits and corrections. */
const shareMembers = computed(() => props.group.members.filter((m) => !m.left_on || props.line?.shares?.some((s) => s.member_id === m.id)))

/** "-150" → −15000; "+150" or "150" → 15000. */
const signed = (value: string | undefined) => {
  const v = (value ?? '').trim()
  const negative = v.startsWith('-') || v.startsWith('−')
  const centavos = toCentavos(v.replace(/^[+\-−]/, '')) ?? 0
  return negative ? -centavos : centavos
}
const changesTotal = computed(() => shareMembers.value.reduce((sum, m) => sum + signed(changes[m.id]), 0))

watch(() => props.line?.id, () => {
  mode.value = null
  splitMethod.value = props.line?.split_method ?? 'equal'
  for (const k of Object.keys(numbers)) delete numbers[Number(k)]
  for (const k of Object.keys(changes)) delete changes[Number(k)]
  reason.value = ''
})

async function act(action: () => Promise<string>) {
  busy.value = true
  try {
    emit('changed', await action())
    mode.value = null
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function saveSplit() {
  const line = props.line!
  const body: { method: string; weights?: Record<number, number>; amounts?: Record<number, number> } = { method: splitMethod.value }
  const filled = shareMembers.value.filter((m) => (numbers[m.id] ?? '').trim() !== '')
  if (splitMethod.value === 'weights') body.weights = Object.fromEntries(filled.map((m) => [m.id, Number(numbers[m.id])]))
  if (splitMethod.value === 'custom') body.amounts = Object.fromEntries(filled.map((m) => [m.id, toCentavos(numbers[m.id]) ?? 0]))
  await act(async () => (await groupService.resplit(props.group.id, line.id, body)).message)
}

async function saveCorrection() {
  const line = props.line!
  const map = Object.fromEntries(shareMembers.value.map((m) => [m.id, signed(changes[m.id])]).filter(([, v]) => v !== 0))
  if (!Object.keys(map).length) return toast.error('Type at least one change.')
  if (line.is_locked && changesTotal.value !== 0) return toast.error('For an owner bill, the changes must add up to ₱0.')
  if (!reason.value.trim()) return toast.error('Give a reason.')
  await act(async () => (await groupService.correct(props.group.id, line.id, map, reason.value.trim())).message)
}

async function remove() {
  const line = props.line!
  if (!(await prompt.confirm('Delete this expense?', `${line.description}, ${peso(line.amount_centavos)}. Everyone's share of it goes away.`, 'Delete'))) return
  await act(() => groupService.deleteExpense(props.group.id, line.id))
}
</script>

<style scoped>
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.gap {
  margin-top: 8px;
}
.small {
  font-size: 0.85rem;
}
.link {
  color: var(--ion-color-primary);
  font-size: 0.85rem;
}
.warn {
  color: var(--ion-color-danger);
}
</style>
