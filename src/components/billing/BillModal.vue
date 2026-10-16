<template>
  <ion-modal :is-open="bill !== null" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ bill?.number ?? 'Bill' }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div v-if="bill" class="narrow">
        <p>
          <strong>{{ bill.payer.name }}</strong><template v-if="bill.room_label"> · Room {{ bill.room_label }}</template><br />
          {{ bill.kind_label }}<template v-if="bill.period_start_on"> · {{ span(bill) }}</template><br />
          Issued {{ manilaDate(bill.issued_on).format('MMM D, YYYY') }} · due <strong>{{ manilaDate(bill.due_on).format('MMM D, YYYY') }}</strong>
        </p>
        <ion-badge :color="billStatus(bill).color">{{ billStatus(bill).label }}</ion-badge>
        <ion-badge v-if="bill.is_late" color="danger" class="gap-left">Late · {{ bill.late_notice_number }}</ion-badge>

        <!-- Follow-up (C7) -->
        <div v-if="bill.under_review" class="review">
          <strong>Under review</strong> since {{ manila(bill.under_review.since).format('MMM D') }}<template v-if="bill.under_review.by"> ({{ bill.under_review.by }})</template>:
          {{ bill.under_review.reason }}. No reminders or late marking until the review ends.
        </div>
        <div class="actions">
          <ion-button v-if="bill.is_late" size="small" fill="outline" @click="notice">Late notice (PDF)</ion-button>
          <ion-button v-if="canMarkLate && bill.is_overdue && !bill.is_late && !bill.under_review" size="small" fill="outline" color="danger" :disabled="busy" @click="markLate">
            Mark late now
          </ion-button>
          <template v-if="canReview && bill.status !== 'paid'">
            <ion-button v-if="!bill.under_review" size="small" fill="clear" :disabled="busy" @click="startReview">Put under review</ion-button>
            <ion-button v-else size="small" fill="clear" :disabled="busy" @click="endReview">End review</ion-button>
          </template>
        </div>

        <ion-list lines="full" class="gap">
          <ion-item v-for="l in bill.lines" :key="l.id">
            <ion-label class="ion-text-wrap">
              <h3>{{ l.description }}</h3>
              <p v-if="l.reason">{{ l.reason }}</p>
            </ion-label>
            <ion-note slot="end" :color="l.amount_centavos < 0 ? 'success' : undefined">{{ peso(l.amount_centavos) }}</ion-note>
          </ion-item>
          <ion-item>
            <ion-label><strong>Total</strong></ion-label>
            <ion-note slot="end"><strong>{{ peso(bill.total_centavos) }}</strong></ion-note>
          </ion-item>
          <ion-item>
            <ion-label>Still owed</ion-label>
            <ion-note slot="end">{{ peso(bill.balance_centavos) }}</ion-note>
          </ion-item>
        </ion-list>

        <template v-if="canCorrect">
          <h3>Correct this bill</h3>
          <p class="muted small">Issued lines are never changed. A correction is a new line: add to the bill, or take off (a credit). The payer sees the reason.</p>
          <ion-segment :value="direction" @ion-change="direction = String($event.detail.value) as 'add' | 'take_off'">
            <ion-segment-button value="take_off"><ion-label>Take off</ion-label></ion-segment-button>
            <ion-segment-button value="add"><ion-label>Add</ion-label></ion-segment-button>
          </ion-segment>
          <div class="row">
            <ion-input v-model="amount" inputmode="decimal" label="Amount (₱)" label-placement="stacked" fill="outline" />
            <ion-select v-model="lineId" label="Line it corrects" label-placement="stacked" fill="outline" interface="popover">
              <ion-select-option :value="null">The whole bill</ion-select-option>
              <ion-select-option v-for="l in bill.lines.filter((x) => x.amount_centavos > 0)" :key="l.id" :value="l.id">{{ l.description }}</ion-select-option>
            </ion-select>
          </div>
          <ion-input v-model="reason" label="Reason" label-placement="stacked" fill="outline" class="gap" :maxlength="255" placeholder="e.g. Two days without water" />
          <ion-button expand="block" class="form-actions" :disabled="busy" @click="correct">Save correction</ion-button>
        </template>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { ref, watch } from 'vue'
import { billStatus } from '@/lib/billing'
import { manila, manilaDate } from '@/lib/dayjs'
import { openDocument } from '@/lib/documents'
import { peso, toCentavos } from '@/lib/money'
import { firstError } from '@/services/api'
import { billingService } from '@/services/billing'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Bill } from '@/types/billing'

const props = withDefaults(defineProps<{ bill: Bill | null; canCorrect: boolean; canReview?: boolean; canMarkLate?: boolean }>(), {
  canReview: false,
  canMarkLate: false,
})
const emit = defineEmits<{ close: []; changed: [bill: Bill, message: string] }>()

const toast = useToast()
const prompt = usePrompt()

/** Run a follow-up action on the bill and hand the updated bill to the parent. */
async function act(action: () => Promise<{ bill: Bill; message: string }>) {
  busy.value = true
  try {
    const { bill, message } = await action()
    emit('changed', bill, message)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function markLate() {
  if (!props.bill) return
  const ok = await prompt.confirm('Mark this bill late now?', `${props.bill.payer.name} gets a numbered late notice. No fee is added.`, 'Mark late')
  if (ok) await act(() => billingService.markLate(props.bill!.id))
}

async function startReview() {
  if (!props.bill) return
  const why = await prompt.reason('Put this bill under review?', 'Reminders and late marking stop until you end the review.', 'Start review', 'Reason, e.g. says she paid by GCash')
  if (why) await act(() => billingService.startReview(props.bill!.id, why))
}

async function endReview() {
  if (props.bill) await act(() => billingService.endReview(props.bill!.id))
}

async function notice() {
  if (!props.bill) return
  try {
    await openDocument(() => billingService.noticeLink(props.bill!.id))
  } catch (e) {
    toast.error(firstError(e))
  }
}
const direction = ref<'add' | 'take_off'>('take_off')
const amount = ref('')
const lineId = ref<number | null>(null)
const reason = ref('')
const busy = ref(false)

function reset() {
  direction.value = 'take_off'
  amount.value = ''
  lineId.value = null
  reason.value = ''
}

// A new bill opened; the same bill swapped for its corrected copy keeps the form.
watch(() => props.bill?.id, (id, before) => id && id !== before && reset())

const span = (b: Bill) => `${manilaDate(b.period_start_on!).format('MMM D')} – ${manilaDate(b.period_end_on!).format('MMM D, YYYY')}`

async function correct() {
  const centavos = toCentavos(amount.value)
  if (!props.bill) return
  if (!centavos) return toast.error('Enter the amount in pesos.')
  if (!reason.value.trim()) return toast.error('Give a reason. The payer sees it.')
  busy.value = true
  try {
    const { bill, message } = await billingService.adjust(props.bill.id, {
      amount_centavos: direction.value === 'add' ? centavos : -centavos,
      reason: reason.value.trim(),
      line_id: lineId.value,
    })
    reset()
    emit('changed', bill, message)
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
.gap-left {
  margin-left: 4px;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.review {
  background: var(--ion-color-light);
  border-radius: 8px;
  padding: 8px 12px;
  margin-top: 8px;
}
</style>
