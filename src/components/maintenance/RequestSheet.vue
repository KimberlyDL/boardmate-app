<template>
  <ion-modal :is-open="requestId !== null" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ item ? item.category_label : 'Request' }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p v-if="!item" class="muted">Loading…</p>

        <template v-else>
          <p>
            <ion-badge :color="statusColor">{{ item.status_label }}</ion-badge>
            <ion-badge v-if="item.urgency === 'urgent'" color="danger" class="space">Urgent</ion-badge>
          </p>
          <p class="body">{{ item.description }}</p>
          <p class="muted small">
            {{ item.room ? `Room ${item.room.label}` : 'Whole place' }} · {{ item.property.name }} · by {{ item.reported_by.name }}
            <template v-if="item.created_at">, {{ manilaDate(item.created_at).format('MMM D, YYYY h:mm A') }}</template>
          </p>
          <p v-if="item.assignee" class="small">Assigned to <strong>{{ item.assignee.name }}</strong></p>
          <p v-if="item.resolution" class="small">What was done: {{ item.resolution }}</p>
          <p v-if="item.cancel_reason" class="small warn">Cancelled: {{ item.cancel_reason }}</p>
          <p v-if="item.repair_cost_centavos != null" class="small">Repair cost: {{ peso(item.repair_cost_centavos) }} (records only)</p>
          <p v-if="item.charge" class="small">Charged to the boarder: {{ peso(item.charge.amount_centavos) }} ({{ item.charge.number }})</p>
          <p v-if="item.unit?.not_ready" class="small warn">{{ item.unit.label }} is Not ready. Set it ready again once the repair is done.</p>

          <div v-if="item.photos?.length" class="photos">
            <a v-for="(url, i) in item.photos" :key="i" :href="url" target="_blank" rel="noopener"><img :src="url" :alt="`Photo ${i + 1}`" /></a>
          </div>

          <!-- The boarder, once it is marked as fixed -->
          <ion-card v-if="item.can?.confirm" class="ask">
            <ion-card-content>
              <strong>Is it fixed?</strong>
              <p>If you do nothing, this closes by itself 3 days after it was fixed.</p>
              <ion-button size="small" :disabled="busy" @click="run(() => maintenanceService.confirm(item!.id))">Yes, it is fixed</ion-button>
              <ion-button size="small" fill="outline" color="danger" :disabled="busy" @click="stillBroken">Still broken</ion-button>
            </ion-card-content>
          </ion-card>

          <!-- Staff actions -->
          <div class="actions">
            <ion-button v-if="item.can?.start" size="small" :disabled="busy" @click="run(() => maintenanceService.start(item!.id))">Start work</ion-button>
            <ion-button v-if="item.can?.resolve" size="small" color="success" :disabled="busy" @click="resolve">Mark as fixed</ion-button>
            <ion-button v-if="item.can?.assign" size="small" fill="outline" :disabled="busy" @click="assign">Assign</ion-button>
            <ion-button v-if="item.can?.set_cost" size="small" fill="outline" :disabled="busy" @click="cost">Repair cost</ion-button>
            <ion-button v-if="item.can?.set_not_ready && item.unit" size="small" fill="outline" :disabled="busy" @click="run(() => maintenanceService.setNotReady(item!.id, !item!.unit!.not_ready))">
              {{ item.unit.not_ready ? `Set ${item.unit.label} ready` : `Set ${item.unit.label} Not ready` }}
            </ion-button>
            <ion-button v-if="item.can?.charge" size="small" fill="outline" :disabled="busy" @click="charge">Charge the boarder</ion-button>
            <ion-button v-if="item.can?.cancel" size="small" fill="clear" color="danger" :disabled="busy" @click="cancel">Cancel request</ion-button>
          </div>

          <h3>History</h3>
          <p v-if="!item.history?.length" class="muted small">Nothing yet.</p>
          <ion-list v-else lines="full">
            <ion-item v-for="(h, i) in item.history" :key="i">
              <ion-label class="ion-text-wrap">
                <p class="small">{{ h.author ?? 'DormLink' }}<template v-if="h.created_at"> · {{ manilaDate(h.created_at).format('MMM D, h:mm A') }}</template></p>
                <h3>{{ h.body }}</h3>
              </ion-label>
            </ion-item>
          </ion-list>

          <template v-if="item.can?.add_note">
            <ion-textarea v-model="note" aria-label="Add a note" fill="outline" class="gap" :rows="2" :auto-grow="true" :maxlength="1000" placeholder="Add a note (everyone on this request sees it)" />
            <ion-button size="small" class="gap" :disabled="busy || !note.trim()" @click="addNote">Add note</ion-button>
          </template>
        </template>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  alertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, ref, watch } from 'vue'
import { manilaDate } from '@/lib/dayjs'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { firstError } from '@/services/api'
import { maintenanceService } from '@/services/maintenance'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { MaintenanceRequest } from '@/types/maintenance'

/**
 * One request: details, photos, history, and the actions the viewer may take
 * (the API's `can`). `assignees`: whom staff can assign it to.
 */
const props = defineProps<{ requestId: number | null; assignees?: { id: number; name: string }[] }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const toast = useToast()
const prompt = usePrompt()
const item = ref<MaintenanceRequest | null>(null)
const busy = ref(false)
const note = ref('')

const statusColor = computed(() => {
  switch (item.value?.status) {
    case 'submitted':
      return 'warning'
    case 'in_progress':
      return 'primary'
    case 'resolved':
    case 'closed':
      return 'success'
    default:
      return 'medium'
  }
})

watch(
  () => props.requestId,
  async (id) => {
    item.value = null
    note.value = ''
    if (id === null) return
    try {
      item.value = await maintenanceService.get(id)
    } catch (e) {
      toast.error(firstError(e))
    }
  },
)

/** Run an action, show its message and the updated request, and tell the list behind. */
async function run(action: () => Promise<{ request: MaintenanceRequest; message: string }>) {
  busy.value = true
  try {
    const { request, message } = await action()
    item.value = request
    toast.success(message)
    emit('changed')
    return true
  } catch (e) {
    toast.error(firstError(e))
    return false
  } finally {
    busy.value = false
  }
}

/** A small dialog; resolves to the typed values, or null if cancelled. */
async function ask(header: string, message: string, inputs: { name: string; type?: 'text' | 'textarea'; placeholder?: string; value?: string; inputmode?: 'decimal' }[], action: string) {
  const alert = await alertController.create({
    header,
    message,
    inputs: inputs.map((i) => ({ type: i.type ?? 'text', name: i.name, placeholder: i.placeholder, value: i.value, attributes: i.inputmode ? { inputmode: i.inputmode } : undefined })),
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: action, role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  return role === 'confirm' ? ((data?.values ?? {}) as Record<string, string>) : null
}

async function resolve() {
  const values = await ask('Mark as fixed', 'What was done (optional). The boarder is asked to confirm.', [{ name: 'resolution', type: 'textarea', placeholder: 'e.g. Replaced the pipe under the sink.' }], 'Mark as fixed')
  if (values) await run(() => maintenanceService.resolve(item.value!.id, values.resolution?.trim() || null))
}

async function stillBroken() {
  const reason = await prompt.reason('Still broken?', 'Tell them what is still wrong. It goes back to the owner and caretakers.', 'Send back', 'What is still wrong')
  if (reason) await run(() => maintenanceService.reopen(item.value!.id, reason))
}

async function cancel() {
  const isMine = !props.assignees
  if (isMine) {
    if (await prompt.confirm('Cancel this request?', 'Nobody has started on it yet.', 'Cancel request')) await run(() => maintenanceService.cancel(item.value!.id, null))
    return
  }
  const reason = await prompt.reason('Cancel this request?', 'The boarder sees the reason.', 'Cancel request', 'Reason (shown to the boarder)')
  if (reason) await run(() => maintenanceService.cancel(item.value!.id, reason))
}

async function assign() {
  const people = props.assignees ?? []
  const alert = await alertController.create({
    header: 'Assign to',
    inputs: [
      { type: 'radio' as const, label: 'Nobody', value: 0, checked: !item.value?.assignee },
      ...people.map((p) => ({ type: 'radio' as const, label: p.name, value: p.id, checked: item.value?.assignee?.id === p.id })),
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Assign', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role === 'confirm') await run(() => maintenanceService.assign(item.value!.id, Number(data?.values) || null))
}

async function cost() {
  const current = item.value?.repair_cost_centavos
  const values = await ask('Repair cost', 'For your records only. It is not billed to anyone. Leave empty to clear.', [{ name: 'amount', placeholder: '₱', value: current != null ? toPesoInput(current) : '', inputmode: 'decimal' }], 'Save')
  if (!values) return
  const raw = (values.amount ?? '').trim()
  const centavos = raw === '' ? null : toCentavos(raw)
  if (raw !== '' && centavos === null) return toast.error('Enter the amount in pesos.')
  await run(() => maintenanceService.setCost(item.value!.id, centavos))
}

async function charge() {
  const values = await ask(
    'Charge the boarder',
    'Only if they caused the damage. It is added to their bills with your reason, and they are told.',
    [
      { name: 'amount', placeholder: 'Amount (₱)', inputmode: 'decimal' },
      { name: 'reason', placeholder: 'Reason (shown to the boarder)' },
    ],
    'Add charge',
  )
  if (!values) return
  const centavos = toCentavos(values.amount ?? '')
  if (!centavos) return toast.error('Enter the amount in pesos.')
  if (!values.reason?.trim()) return toast.error('Give a reason.')
  await run(() => maintenanceService.charge(item.value!.id, centavos, values.reason.trim()))
}

async function addNote() {
  if (await run(() => maintenanceService.note(item.value!.id, note.value.trim()))) note.value = ''
}
</script>

<style scoped>
.space {
  margin-left: 6px;
}
.body {
  white-space: pre-wrap;
}
.small {
  font-size: 0.85rem;
}
.warn {
  color: var(--ion-color-danger);
}
.photos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 8px;
  margin: 8px 0;
}
.photos img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
}
.ask {
  border-left: 4px solid var(--ion-color-warning);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}
.gap {
  margin-top: 8px;
}
</style>
