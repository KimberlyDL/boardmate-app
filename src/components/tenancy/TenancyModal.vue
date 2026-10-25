<template>
  <ion-modal :is-open="tenancyId !== null" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ tenancy?.tenant.name ?? 'Tenancy' }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <DlSkeleton v-if="loading" :height="120" :radius="18" />

        <template v-else-if="tenancy">
          <ion-card>
            <ion-card-content>
              <p>
                <strong>Room {{ tenancy.room.label }} · {{ tenancy.unit.label }}</strong><br />
                {{ tenancy.tenant.phone ?? 'No phone' }}<template v-if="tenancy.tenant.email"> · {{ tenancy.tenant.email }}</template>
              </p>
              <p>
                Moved in <strong>{{ manilaDate(tenancy.moved_in_on).format('MMM D, YYYY') }}</strong>, first day
                {{ manilaDate(tenancy.first_day_on).format('MMM D') }}.<br />
                Rent due every month on the <strong>{{ tenancy.anchor_day }}</strong>; next
                <strong>{{ manilaDate(tenancy.next_rent_due_on).format('MMM D, YYYY') }}</strong>.
              </p>
              <p>
                Rent <strong>{{ peso(tenancy.rent_centavos) }}</strong>
                <template v-if="tenancy.discount"> − {{ tenancy.discount.label }} {{ peso(tenancy.discount.amount_centavos) }} = <strong>{{ peso(tenancy.rent_after_discount_centavos) }}</strong></template>
              </p>
              <p v-if="tenancy.activation_override" class="override">
                Moved in without the deposit and first rent in full: “{{ tenancy.activation_override.reason }}”
              </p>
            </ion-card-content>
          </ion-card>

          <!-- End of stay (C1) and deposit (C8) -->
          <h3>End of stay</h3>
          <div class="stay">
            <template v-if="tenancy.status === 'active'">
              <p v-if="tenancy.pending_notice">
                Gave notice: last day <strong>{{ manilaDate(tenancy.pending_notice.end_on).format('MMM D, YYYY') }}</strong>, waiting for approval.
                <ion-badge v-if="tenancy.pending_notice.is_short_notice" color="warning">Short notice</ion-badge>
              </p>
              <p v-else class="muted">Month to month, no end date.</p>
              <div v-if="canApproveMoveOut" class="actions">
                <template v-if="tenancy.pending_notice">
                  <ion-button size="small" :disabled="busy" @click="approveNotice">Approve notice</ion-button>
                  <ion-button size="small" fill="outline" color="danger" :disabled="busy" @click="declineNotice">Decline</ion-button>
                </template>
                <ion-button size="small" fill="outline" :disabled="busy" @click="setEndDate">Set an end date</ion-button>
                <ion-button size="small" fill="clear" :disabled="busy" @click="moveOut">Left without notice</ion-button>
              </div>
            </template>

            <template v-else-if="tenancy.status === 'notice_given'">
              <p>
                Leaving: last day <strong>{{ manilaDate(tenancy.end_on!).format('MMM D, YYYY') }}</strong>.
                <ion-badge v-if="tenancy.is_overstaying" color="danger">Past the last day</ion-badge>
              </p>
              <div v-if="canApproveMoveOut" class="actions">
                <ion-button size="small" :disabled="busy" @click="moveOut">Record move-out</ion-button>
                <ion-button size="small" fill="outline" :disabled="busy" @click="setEndDate">Change end date</ion-button>
                <ion-button size="small" fill="clear" color="danger" :disabled="busy" @click="cancelEndDate">Cancel end date</ion-button>
              </div>
            </template>

            <template v-else>
              <p>Moved out <strong>{{ manilaDate(tenancy.moved_out_on!).format('MMM D, YYYY') }}</strong>.</p>
              <div class="actions">
                <ion-button v-if="tenancy.status === 'ended' && canSettle" size="small" @click="settling = true">Settle the deposit</ion-button>
                <ion-button v-if="tenancy.status === 'settled'" size="small" fill="outline" @click="settling = true">Settlement</ion-button>
              </div>
              <p v-if="tenancy.status === 'ended' && !canSettle" class="muted small">The owner or a Manager settles the deposit.</p>
            </template>
          </div>

          <settlement-modal :open="settling" :tenancy="tenancy" :can-settle="canSettle" @close="settling = false" @settled="settled" />

          <!-- Received at move-in -->
          <h3>Received at move-in</h3>
          <p v-if="!tenancy.payments?.length" class="muted">Nothing was recorded.</p>
          <ion-list v-else lines="full">
            <ion-item v-for="p in tenancy.payments" :key="p.id">
              <ion-label>
                <h2>{{ p.kind_label }} · {{ peso(p.amount_centavos) }}</h2>
                <p>{{ p.method_label }} · {{ manilaDate(p.received_on).format('MMM D, YYYY') }}<template v-if="p.reference"> · ref {{ p.reference }}</template></p>
              </ion-label>
            </ion-item>
          </ion-list>

          <!-- Emergency contact -->
          <h3>Emergency contact</h3>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <h2>{{ tenancy.emergency_contact.name }}</h2>
              <p>{{ tenancy.emergency_contact.relationship ?? '—' }} · {{ tenancy.emergency_contact.phone }}</p>
            </ion-label>
            <ion-button v-if="canManage" slot="end" size="small" fill="outline" @click="editContact">Edit</ion-button>
          </ion-item>

          <!-- Agreed rate -->
          <h3>Agreed rate</h3>
          <p v-if="!history.length" class="muted">No discount.</p>
          <ion-list v-else lines="full">
            <ion-item v-for="d in history" :key="d.id">
              <ion-label>
                <h2>{{ describe(d) }}</h2>
                <p>
                  From {{ manilaDate(d.effective_from).format('MMM D, YYYY') }}<template v-if="d.effective_to"> to {{ manilaDate(d.effective_to).format('MMM D, YYYY') }}</template>
                </p>
              </ion-label>
              <ion-badge slot="end" :color="d.status === 'active' ? 'success' : d.status === 'scheduled' ? 'primary' : 'medium'">{{ d.status }}</ion-badge>
            </ion-item>
          </ion-list>

          <template v-if="canManage">
            <ion-button v-if="!editing" size="small" fill="outline" class="gap" @click="startDiscount">Set a discount</ion-button>
            <ion-button v-if="!editing && hasOpenDiscount" size="small" fill="outline" color="danger" class="gap" @click="endDiscount">End the discount</ion-button>

            <ion-card v-if="editing" class="gap">
              <ion-card-content>
                <p class="muted small">It starts on the date you pick (today or later). The discount now in force ends the day before.</p>
                <div class="row">
                  <ion-select v-model="draft.kind" label="Discount" label-placement="stacked" fill="outline" interface="popover">
                    <ion-select-option value="fixed">Fixed amount (₱)</ion-select-option>
                    <ion-select-option value="percent">Percent (%)</ion-select-option>
                  </ion-select>
                  <ion-input v-model="draft.value" inputmode="decimal" :label="draft.kind === 'percent' ? 'Percent off' : 'Pesos off'" label-placement="stacked" fill="outline" />
                </div>
                <ion-input v-model="draft.from" type="date" :min="today" label="Starts on" label-placement="stacked" fill="outline" class="gap" />
                <ion-button class="gap" :disabled="busy" @click="saveDiscount">Save</ion-button>
                <ion-button fill="clear" color="medium" @click="editing = false">Cancel</ion-button>
              </ion-card-content>
            </ion-card>
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
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, reactive, ref, watch } from 'vue'
import { manila, manilaDate } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { discountOf } from '@/lib/moveIn'
import { firstError } from '@/services/api'
import { tenancyService } from '@/services/tenancies'
import SettlementModal from '@/components/tenancy/SettlementModal.vue'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { DiscountKind } from '@/types/enums'
import type { DiscountRow, Tenancy } from '@/types/tenancy'
import DlSkeleton from '@/components/dl/DlSkeleton.vue'

/** One tenant's stay for the owner or a caretaker: what was received at move-in, the emergency contact and the agreed rate. */
const props = withDefaults(defineProps<{ tenancyId: number | null; canManage: boolean; canApproveMoveOut?: boolean; canSettle?: boolean }>(), {
  canApproveMoveOut: false,
  canSettle: false,
})
const emit = defineEmits<{ close: []; changed: [] }>()

const toast = useToast()
const prompt = usePrompt()
const settling = ref(false)

/** Ask for a date (and a reason) in one dialog; null when cancelled or incomplete. */
async function askDate(header: string, message: string, value: string, opts: { min?: string; max?: string; reasonRequired: boolean; reasonHint: string }) {
  const alert = await alertController.create({
    header,
    message,
    inputs: [
      { name: 'date', type: 'date', value, min: opts.min, max: opts.max },
      { name: 'reason', type: 'textarea', placeholder: opts.reasonHint },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return null
  const date = data?.values?.date as string
  const reason = ((data?.values?.reason as string) ?? '').trim()
  if (!date) {
    toast.error('Pick a date.')
    return null
  }
  if (opts.reasonRequired && !reason) {
    toast.error('Give a reason. The boarder sees it.')
    return null
  }
  return { date, reason }
}

const thirtyDaysBack = () => manila().subtract(30, 'day').format('YYYY-MM-DD')

async function stayAction(action: () => Promise<{ message: string }>) {
  busy.value = true
  try {
    toast.success((await action()).message)
    await load()
    emit('changed')
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function approveNotice() {
  const t = tenancy.value!
  const ok = await prompt.confirm('Approve this notice?', `Last day: ${manilaDate(t.pending_notice!.end_on).format('MMM D, YYYY')}. No rent period starts after it.`, 'Approve')
  if (ok) await stayAction(() => tenancyService.approveNotice(t.id))
}

async function declineNotice() {
  const reason = await prompt.reason('Decline this notice?', 'They stay on, month to month.', 'Decline', 'Reason (shown to the boarder)')
  if (reason) await stayAction(async () => ({ message: await tenancyService.declineNotice(tenancy.value!.id, reason) }))
}

async function setEndDate() {
  const t = tenancy.value!
  const asked = await askDate(
    t.end_on ? 'Change the last day' : 'Set the last day',
    'The last day of stay; the room is free the day after. Up to 30 days back for someone who already left.',
    t.end_on ?? t.pending_notice?.end_on ?? today.value,
    { min: thirtyDaysBack(), reasonRequired: true, reasonHint: 'Reason (shown to the boarder)' },
  )
  if (asked) await stayAction(() => tenancyService.setEndDate(t.id, asked.date, asked.reason))
}

async function cancelEndDate() {
  const reason = await prompt.reason('Cancel the last day?', 'They stay on, month to month.', 'Cancel end date', 'Reason (shown to the boarder)')
  if (reason) await stayAction(() => tenancyService.cancelEndDate(tenancy.value!.id, reason))
}

async function moveOut() {
  const t = tenancy.value!
  const noNotice = t.status === 'active'
  const asked = await askDate(
    noNotice ? 'Left without notice' : 'Record the move-out',
    'The day they actually left (today or up to 30 days back). The room becomes available, and the last month\'s fixed utilities go on a final bill.',
    t.end_on && t.end_on <= today.value ? t.end_on : today.value,
    { min: thirtyDaysBack(), max: today.value, reasonRequired: noNotice, reasonHint: noNotice ? 'Reason, e.g. left without notice' : 'Note (optional)' },
  )
  if (asked) await stayAction(() => tenancyService.recordMoveOut(t.id, asked.date, asked.reason || undefined))
}

function settled(message: string) {
  settling.value = false
  toast.success(message)
  load()
  emit('changed')
}
const loading = ref(false)
const busy = ref(false)
const tenancy = ref<Tenancy | null>(null)
const history = ref<DiscountRow[]>([])
const editing = ref(false)
const today = ref(manila().format('YYYY-MM-DD'))
const draft = reactive<{ kind: DiscountKind; value: string; from: string }>({ kind: 'fixed', value: '', from: today.value })

/** A discount in force or scheduled: something the owner can end. */
const hasOpenDiscount = computed(() => history.value.some((d) => d.status !== 'ended'))

function describe(d: DiscountRow): string {
  return d.kind === 'percent' ? `${d.value / 100}% off` : `${peso(d.value)} off`
}

async function load() {
  if (props.tenancyId === null) return
  loading.value = true
  try {
    const [t, h] = await Promise.all([tenancyService.get(props.tenancyId), tenancyService.discounts(props.tenancyId)])
    tenancy.value = t
    history.value = h
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

watch(
  () => props.tenancyId,
  (id) => {
    editing.value = false
    tenancy.value = null
    if (id !== null) load()
  },
)

async function run(action: () => Promise<unknown>, success: string | (() => string)) {
  busy.value = true
  try {
    await action()
    toast.success(typeof success === 'function' ? success() : success)
    editing.value = false
    await load()
    emit('changed')
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function editContact() {
  if (!tenancy.value) return
  const c = tenancy.value.emergency_contact
  const alert = await alertController.create({
    header: 'Emergency contact',
    inputs: [
      { name: 'name', type: 'text', placeholder: 'Name', value: c.name },
      { name: 'relationship', type: 'text', placeholder: 'Relationship', value: c.relationship ?? '' },
      { name: 'phone', type: 'tel', placeholder: 'Phone', value: c.phone },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  const v = data?.values ?? {}
  if (!String(v.name ?? '').trim() || !String(v.phone ?? '').trim()) return toast.error('Enter a name and a phone number.')
  await run(
    () => tenancyService.updateEmergencyContact(tenancy.value!.id, { name: String(v.name).trim(), relationship: String(v.relationship ?? '').trim() || null, phone: String(v.phone).trim() }),
    'Emergency contact saved.',
  )
}

function startDiscount() {
  today.value = manila().format('YYYY-MM-DD')
  Object.assign(draft, { kind: 'fixed', value: '', from: today.value })
  editing.value = true
}

async function saveDiscount() {
  const discount = discountOf({ discountKind: draft.kind, discountValue: draft.value })
  if (!discount) return toast.error(draft.kind === 'percent' ? 'Enter a percentage between 0.01 and 100.' : 'Enter the amount in pesos, e.g. 500.')
  let message = 'Discount saved.'
  await run(
    async () => {
      message = (await tenancyService.setDiscount(tenancy.value!.id, { ...discount, effective_from: draft.from })) || message
    },
    () => message,
  )
}

async function endDiscount() {
  const alert = await alertController.create({
    header: 'End the discount',
    message: 'From when does the tenant pay the full rent? The discount stays for the days before.',
    inputs: [{ name: 'from', type: 'date', value: manila().format('YYYY-MM-DD'), min: manila().format('YYYY-MM-DD') }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'End discount', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  await run(() => tenancyService.endDiscount(tenancy.value!.id, data?.values?.from), 'Discount ended.')
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
.override {
  color: var(--ion-color-warning-shade);
}
.stay {
  background: var(--ion-color-light);
  border-radius: 8px;
  padding: 8px 12px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 4px;
}
</style>
