<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Deposit · {{ tenancy?.tenant.name }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <DlSkeleton v-if="loading" :height="120" :radius="18" />

        <!-- Settled: the result -->
        <template v-else-if="result">
          <ion-list lines="full">
            <ion-item><ion-label>Deposit held</ion-label><ion-note slot="end">{{ peso(result.deposit_held_centavos) }}</ion-note></ion-item>
            <ion-item v-for="d in result.deductions" :key="d.bill_number">
              <ion-label class="ion-text-wrap"><h3>Deducted: {{ d.description }}</h3><p>{{ d.reason }} · {{ d.bill_number }}</p></ion-label>
              <ion-note slot="end">{{ peso(d.amount_centavos) }}</ion-note>
            </ion-item>
            <ion-item><ion-label>Used to pay bills</ion-label><ion-note slot="end">−{{ peso(result.applied_centavos) }}</ion-note></ion-item>
            <ion-item v-if="result.kept_centavos">
              <ion-label class="ion-text-wrap"><h3>Kept</h3><p>{{ result.kept_reason }}</p></ion-label>
              <ion-note slot="end">−{{ peso(result.kept_centavos) }}</ion-note>
            </ion-item>
            <ion-item v-if="result.credit_returned_centavos"><ion-label>Unused credit returned</ion-label><ion-note slot="end">{{ peso(result.credit_returned_centavos) }}</ion-note></ion-item>
            <ion-item>
              <ion-label><strong>Refunded</strong><p v-if="result.refund_method_label">{{ result.refund_method_label }}<template v-if="result.refunded_on">, {{ manilaDate(result.refunded_on).format('MMM D, YYYY') }}</template></p></ion-label>
              <ion-note slot="end"><strong>{{ peso(result.refund_centavos) }}</strong></ion-note>
            </ion-item>
          </ion-list>
          <p v-if="result.still_owed_centavos" class="owed">Still owed after the deposit: {{ peso(result.still_owed_centavos) }} (on the overdue list).</p>
          <p class="muted small">Settled by {{ result.settled_by }}.</p>
          <ion-button expand="block" fill="outline" @click="summary">Settlement summary (PDF)</ion-button>
        </template>

        <!-- Not settled yet: the worksheet -->
        <template v-else-if="sheet">
          <ion-card>
            <ion-card-content>
              <div class="line"><span>Deposit held</span><strong>{{ peso(sheet.deposit_held_centavos) }}</strong></div>
              <div class="line"><span>Owed now</span><span>{{ peso(sheet.owed_centavos) }}</span></div>
              <div v-for="b in sheet.unpaid_bills" :key="b.id" class="line small muted">
                <span>{{ b.number }} · {{ b.kind_label }} · due {{ manilaDate(b.due_on).format('MMM D') }}</span><span>{{ peso(b.balance_centavos) }}</span>
              </div>
              <div v-if="sheet.credit_centavos" class="line"><span>Credit held</span><span>{{ peso(sheet.credit_centavos) }}</span></div>
              <p v-if="sheet.deposit_gap_centavos" class="small">
                Rent at move-out was {{ peso(sheet.rent_now_centavos) }}, {{ peso(sheet.deposit_gap_centavos) }} more than the deposit. Add it as a deduction to collect it, or leave it.
              </p>
            </ion-card-content>
          </ion-card>

          <template v-if="canSettle">
            <h3>Deductions</h3>
            <p class="muted small">Damage, cleaning, a utility bill that came late… Each becomes a charge with its reason.</p>
            <div v-for="(d, i) in deductions" :key="i" class="deduction">
              <div class="row">
                <ion-input v-model="d.description" label="What for" label-placement="stacked" fill="outline" :maxlength="160" />
                <ion-input v-model="d.amount" inputmode="decimal" label="Amount (₱)" label-placement="stacked" fill="outline" />
              </div>
              <div class="row-reason">
                <ion-input v-model="d.reason" label="Reason" label-placement="stacked" fill="outline" :maxlength="255" />
                <ion-button fill="clear" color="danger" aria-label="Remove deduction" @click="deductions.splice(i, 1)">Remove</ion-button>
              </div>
            </div>
            <ion-button size="small" fill="outline" @click="deductions.push({ description: '', amount: '', reason: '' })">Add a deduction</ion-button>

            <h3>Keep part of the deposit (optional)</h3>
            <div class="row">
              <ion-input v-model="keep" inputmode="decimal" label="Amount kept (₱)" label-placement="stacked" fill="outline" />
              <ion-input v-model="keepReason" label="Reason" label-placement="stacked" fill="outline" :maxlength="255" />
            </div>

            <ion-card class="result">
              <ion-card-content>
                <div class="line"><span>Deposit pays the bills</span><span>{{ peso(plan.apply) }}</span></div>
                <div v-if="keepCentavos" class="line"><span>Kept</span><span>{{ peso(Math.min(keepCentavos, plan.left)) }}</span></div>
                <div v-if="plan.creditReturned" class="line"><span>Credit returned</span><span>{{ peso(plan.creditReturned) }}</span></div>
                <div class="line"><strong>Refund</strong><strong>{{ peso(plan.refund) }}</strong></div>
                <div v-if="plan.stillOwed" class="line owed"><span>Still owed after</span><span>{{ peso(plan.stillOwed) }}</span></div>
                <p v-if="keepCentavos > plan.left" class="owed small">You can keep at most {{ peso(plan.left) }}.</p>
              </ion-card-content>
            </ion-card>

            <template v-if="plan.refund > 0">
              <h3>Refund</h3>
              <ion-select v-model="refundMethod" label="Paid back by" label-placement="stacked" fill="outline" interface="popover">
                <ion-select-option v-for="(label, value) in manualPaymentMethods" :key="value" :value="value">{{ label }}</ion-select-option>
              </ion-select>
              <div class="row">
                <ion-input v-model="refundReference" label="Reference (optional)" label-placement="stacked" fill="outline" :maxlength="100" />
                <ion-input v-model="refundedOn" type="date" :max="today" label="Refunded on" label-placement="stacked" fill="outline" />
              </div>
            </template>

            <ion-input v-model="note" label="Note (optional)" label-placement="stacked" fill="outline" class="gap" :maxlength="500" />
            <ion-button expand="block" class="form-actions" :disabled="busy" @click="save">Settle the deposit</ion-button>
            <p class="muted small">This is done once and cannot be undone. Deductions show on the boarder's bills and statement.</p>
          </template>
        </template>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
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
import { computed, ref, watch } from 'vue'
import { manualPaymentMethods } from '@/lib/billing'
import { manila, manilaDate } from '@/lib/dayjs'
import { openDocument } from '@/lib/documents'
import { peso, toCentavos } from '@/lib/money'
import { planSettlement } from '@/lib/settlement'
import { firstError } from '@/services/api'
import { tenancyService } from '@/services/tenancies'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { PaymentMethod } from '@/types/enums'
import type { SettlementResult, SettlementWorksheet, Tenancy } from '@/types/tenancy'
import DlSkeleton from '@/components/dl/DlSkeleton.vue'

const props = defineProps<{ open: boolean; tenancy: Tenancy | null; canSettle: boolean }>()
const emit = defineEmits<{ close: []; settled: [message: string] }>()

const toast = useToast()
const prompt = usePrompt()
const today = manila().format('YYYY-MM-DD')
const loading = ref(false)
const busy = ref(false)
const sheet = ref<SettlementWorksheet | null>(null)
const result = ref<SettlementResult | null>(null)
const deductions = ref<{ description: string; amount: string; reason: string }[]>([])
const keep = ref('')
const keepReason = ref('')
const refundMethod = ref<PaymentMethod>('cash')
const refundReference = ref('')
const refundedOn = ref(today)
const note = ref('')

const keepCentavos = computed(() => toCentavos(keep.value) ?? 0)
const deductionsCentavos = computed(() => deductions.value.reduce((sum, d) => sum + (toCentavos(d.amount) ?? 0), 0))
const plan = computed(() =>
  planSettlement(sheet.value?.deposit_held_centavos ?? 0, sheet.value?.owed_centavos ?? 0, sheet.value?.credit_centavos ?? 0, deductionsCentavos.value, keepCentavos.value),
)

async function load() {
  if (!props.tenancy) return
  loading.value = true
  sheet.value = null
  result.value = null
  deductions.value = []
  keep.value = ''
  keepReason.value = ''
  refundReference.value = ''
  refundedOn.value = today
  note.value = ''
  try {
    const data = await tenancyService.settlement(props.tenancy.id)
    if (data.settled) result.value = data
    else sheet.value = data
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

watch(() => props.open, (open) => open && load())

async function save() {
  if (!props.tenancy) return
  const rows = deductions.value.filter((d) => d.description.trim() || d.amount.trim() || d.reason.trim())
  for (const d of rows) {
    if (!d.description.trim() || !toCentavos(d.amount) || !d.reason.trim()) {
      return toast.error('Each deduction needs what it is for, an amount and a reason.')
    }
  }
  if (keepCentavos.value > 0 && !keepReason.value.trim()) return toast.error('Say why you keep part of the deposit.')
  if (keepCentavos.value > plan.value.left) return toast.error(`You can keep at most ${peso(plan.value.left)}.`)

  const ok = await prompt.confirm(
    'Settle the deposit?',
    `Refund ${peso(plan.value.refund)}${plan.value.stillOwed ? `; ${peso(plan.value.stillOwed)} stays owed` : ''}. This is done once.`,
    'Settle',
  )
  if (!ok) return

  busy.value = true
  try {
    const { message } = await tenancyService.settle(props.tenancy.id, {
      deductions: rows.map((d) => ({ description: d.description.trim(), amount_centavos: toCentavos(d.amount)!, reason: d.reason.trim() })),
      keep_centavos: keepCentavos.value || undefined,
      keep_reason: keepReason.value.trim() || undefined,
      refund_method: plan.value.refund > 0 ? refundMethod.value : undefined,
      refund_reference: plan.value.refund > 0 ? refundReference.value.trim() || undefined : undefined,
      refunded_on: plan.value.refund > 0 ? refundedOn.value : undefined,
      note: note.value.trim() || undefined,
    })
    emit('settled', message)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function summary() {
  if (!props.tenancy) return
  try {
    await openDocument(() => tenancyService.settlementSummaryLink(props.tenancy!.id))
  } catch (e) {
    toast.error(firstError(e))
  }
}
</script>

<style scoped>
.line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}
.row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.row-reason {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.row-reason ion-input {
  flex: 1;
}
.deduction {
  border-bottom: 1px solid var(--ion-color-light);
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.small {
  font-size: 0.85rem;
}
.gap {
  margin-top: 8px;
}
.owed {
  color: var(--ion-color-danger);
}
.result {
  margin-top: 12px;
}
</style>
