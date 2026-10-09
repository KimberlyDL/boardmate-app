<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ application ? `Move in ${application.applicant?.name}` : 'Move in a walk-in' }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <!-- Walk-in: who and where -->
        <template v-if="!application">
          <ion-input v-model="email" type="email" inputmode="email" label="Their BoardMate account email" label-placement="stacked" fill="outline" />
          <p class="muted small">They need an account. Ask them to sign up first if they have none.</p>
          <ion-select v-model="unitId" label="Room or bedspace" label-placement="stacked" fill="outline" interface="popover" class="gap">
            <ion-select-option v-for="u in units" :key="u.id" :value="u.id">
              {{ u.room_code ? `Room ${u.room_code} · ` : '' }}{{ u.label }} · {{ peso(u.rent_centavos) }}
            </ion-select-option>
          </ion-select>
          <p v-if="!units?.length" class="muted">No unit is free to rent right now.</p>
        </template>
        <p v-else class="muted">
          {{ application.property.name }} · {{ application.unit?.label }} · reserved until
          {{ manilaDate(application.reserved_until ?? application.planned_move_in_on).format('MMM D, YYYY') }}
        </p>

        <h3>Move-in</h3>
        <ion-input
          v-model="form.moved_in_on"
          type="date"
          :min="earliest"
          :max="today"
          label="Move-in date"
          label-placement="stacked"
          fill="outline"
        />
        <p class="muted small">Rent is due every month on this day. The first day of stay is the day after.</p>

        <h3>Emergency contact</h3>
        <ion-input v-model="form.emergency.name" label="Name" label-placement="stacked" fill="outline" :maxlength="120" />
        <div class="row">
          <ion-input v-model="form.emergency.relationship" label="Relationship" label-placement="stacked" fill="outline" :maxlength="50" />
          <ion-input v-model="form.emergency.phone" type="tel" label="Phone" label-placement="stacked" fill="outline" />
        </div>

        <h3>Agreed rate (optional)</h3>
        <div class="row">
          <ion-select v-model="form.discountKind" label="Discount" label-placement="stacked" fill="outline" interface="popover">
            <ion-select-option value="">None</ion-select-option>
            <ion-select-option value="fixed">Fixed amount (₱)</ion-select-option>
            <ion-select-option value="percent">Percent (%)</ion-select-option>
          </ion-select>
          <ion-input
            v-if="form.discountKind"
            v-model="form.discountValue"
            inputmode="decimal"
            :label="form.discountKind === 'percent' ? 'Percent off' : 'Pesos off the rent'"
            label-placement="stacked"
            fill="outline"
          />
        </div>

        <!-- What it costs -->
        <ion-card v-if="quote || quoteError" class="quote">
          <ion-card-content>
            <p v-if="quoteError" class="error">{{ quoteError }}</p>
            <template v-else-if="quote">
              <div class="line"><span>Monthly rent</span><span>{{ peso(quote.rent_centavos) }}</span></div>
              <div v-if="quote.discount_centavos" class="line"><span>Agreed rate</span><span>−{{ peso(quote.discount_centavos) }}</span></div>
              <div class="line"><strong>Rent after discount</strong><strong>{{ peso(quote.rent_after_discount_centavos) }}</strong></div>
              <div class="line"><span>Deposit</span><span>{{ peso(quote.deposit_centavos) }}</span></div>
              <div class="line"><span>First rent (advance, no utilities)</span><span>{{ peso(quote.first_rent_centavos) }}</span></div>
            </template>
          </ion-card-content>
        </ion-card>

        <h3>Received now</h3>
        <p class="muted small">The deposit and the advance rent for the first period. Utilities are billed later, after the period.</p>
        <div v-for="row in paymentRows" :key="row.key" class="payment">
          <strong>{{ row.label }}</strong>
          <div class="row">
            <ion-input
              v-model="row.form.amount"
              inputmode="decimal"
              label="Amount (₱)"
              label-placement="stacked"
              fill="outline"
              @ion-input="row.touch()"
            />
            <ion-select v-model="row.form.method" label="How" label-placement="stacked" fill="outline" interface="popover">
              <ion-select-option v-for="(label, value) in PaymentMethodLabels" :key="value" :value="value">{{ label }}</ion-select-option>
            </ion-select>
          </div>
          <ion-input v-if="row.form.method !== 'cash'" v-model="row.form.reference" label="Reference number" label-placement="stacked" fill="outline" />
        </div>

        <ion-card v-if="override" color="warning">
          <ion-card-content>
            <p>{{ shortNote }} You can still move them in with a reason. It is logged.</p>
            <ion-textarea v-model="form.overrideReason" label="Reason" label-placement="stacked" fill="outline" :rows="2" :maxlength="500" />
          </ion-card-content>
        </ion-card>

        <!-- Rooms rented whole: who stays -->
        <template v-if="whole">
          <h3>Who stays in the room</h3>
          <p class="muted small">{{ tenantName }} rents the room and becomes its leader. Add everyone else who will stay, with an emergency contact each.</p>
          <ion-card v-for="(person, i) in form.occupants" :key="i" class="person">
            <ion-card-content>
              <ion-input v-model="person.name" label="Name" label-placement="stacked" fill="outline" :maxlength="120" />
              <ion-input v-model="person.contact_phone" type="tel" label="Phone (optional)" label-placement="stacked" fill="outline" class="gap" />
              <ion-input v-model="person.emergency_contact_name" label="Emergency contact" label-placement="stacked" fill="outline" class="gap" />
              <div class="row">
                <ion-input v-model="person.emergency_contact_relationship" label="Relationship" label-placement="stacked" fill="outline" />
                <ion-input v-model="person.emergency_contact_phone" type="tel" label="Contact phone" label-placement="stacked" fill="outline" />
              </div>
              <ion-button size="small" fill="clear" color="danger" @click="form.occupants.splice(i, 1)">Remove</ion-button>
            </ion-card-content>
          </ion-card>
          <ion-button fill="outline" size="small" @click="form.occupants.push(emptyOccupant())">Add a person</ion-button>
        </template>

        <!-- A bedspace room with no leader -->
        <ion-item v-else-if="canMakeLeader" lines="none" class="gap">
          <ion-toggle :checked="form.makeLeader" @ion-change="form.makeLeader = $event.detail.checked">
            <span class="ion-text-wrap">Make {{ tenantName }} the leader of this room</span>
          </ion-toggle>
        </ion-item>

        <ion-item v-if="leads" lines="none" class="gap">
          <ion-checkbox :checked="form.leaderConsent" label-placement="end" @ion-change="form.leaderConsent = $event.detail.checked">
            <span class="ion-text-wrap">{{ tenantName }} agreed to be the room's leader (billed for its shared bills)</span>
          </ion-checkbox>
        </ion-item>

        <ion-button expand="block" class="form-actions" :disabled="busy" @click="submit">Move in</ion-button>
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
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue'
import { computed, reactive, ref, watch } from 'vue'
import { manila, manilaDate } from '@/lib/dayjs'
import { peso, toPesoInput } from '@/lib/money'
import { buildMoveIn, discountOf, emptyMoveIn, emptyOccupant, needsOverride, shortfalls } from '@/lib/moveIn'
import { errorMessage, firstError } from '@/services/api'
import { tenancyService } from '@/services/tenancies'
import { useToast } from '@/composables/useToast'
import { PaymentMethodLabels } from '@/types/enums'
import type { BookingApplication } from '@/types/booking'
import type { MoveInQuote, Tenancy } from '@/types/tenancy'

export interface MovableUnit {
  id: number
  label: string
  room_code: string | null
  kind: 'whole' | 'bedspace'
  rent_centavos: number | null
}

/**
 * Moving someone in: from a reservation (`application`), or a walk-in (`units`
 * to pick from). Shows what the rent, deposit and first rent come to, and takes
 * what was received. Without the deposit and first rent in full it asks for a
 * reason to move in anyway.
 */
const props = defineProps<{
  open: boolean
  property: { id: number; name: string }
  application?: BookingApplication | null
  units?: MovableUnit[]
}>()
const emit = defineEmits<{ close: []; done: [message: string, tenancy: Tenancy] }>()

const toast = useToast()
const today = ref(manila().format('YYYY-MM-DD'))
const earliest = computed(() => manila().subtract(30, 'day').format('YYYY-MM-DD'))
const form = reactive(emptyMoveIn(today.value))
const email = ref('')
const unitId = ref<number | null>(null)
const quote = ref<MoveInQuote | null>(null)
const quoteError = ref('')
const busy = ref(false)
const typed = reactive({ deposit: false, firstRent: false })

const unit = computed(() => props.units?.find((u) => u.id === unitId.value) ?? null)
const whole = computed(() => (props.application ? props.application.property.rental_mode === 'whole' : unit.value?.kind === 'whole'))
const tenantName = computed(() => props.application?.applicant?.name ?? 'The tenant')
const canMakeLeader = computed(() => !whole.value && (props.application !== null || unit.value !== null))
const leads = computed(() => whole.value || form.makeLeader)
const short = computed(() => shortfalls(form, quote.value))
const override = computed(() => needsOverride(form, quote.value))
const shortNote = computed(() => {
  const parts = []
  if (short.value.deposit) parts.push(`the deposit is short by ${peso(short.value.deposit)}`)
  if (short.value.firstRent) parts.push(`the first rent is short by ${peso(short.value.firstRent)}`)
  return parts.length ? `Not recorded in full: ${parts.join(' and ')}.` : ''
})
const paymentRows = computed(() => [
  { key: 'deposit', label: 'Deposit', form: form.deposit, touch: () => (typed.deposit = true) },
  { key: 'firstRent', label: 'First rent', form: form.firstRent, touch: () => (typed.firstRent = true) },
])

// A fresh form each time the sheet opens, with what approval already noted.
watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    today.value = manila().format('YYYY-MM-DD')
    Object.assign(form, emptyMoveIn(today.value))
    typed.deposit = typed.firstRent = false
    quote.value = null
    quoteError.value = ''
    email.value = ''
    unitId.value = props.application?.unit?.id ?? props.units?.[0]?.id ?? null
    if (props.application) {
      form.makeLeader = props.application.leader_on_move_in
      form.occupants = (props.application.planned_occupants ?? []).map((o) => ({
        ...emptyOccupant(),
        name: o.name,
        contact_phone: o.contact_phone ?? '',
        emergency_contact_name: o.emergency_contact_name ?? '',
        emergency_contact_relationship: o.emergency_contact_relationship ?? '',
        emergency_contact_phone: o.emergency_contact_phone ?? '',
      }))
    }
  },
)

// Re-quote when the unit, the date or the discount changes (after a short pause while typing).
let timer: ReturnType<typeof setTimeout> | undefined
watch(
  () => [props.open, unitId.value, form.moved_in_on, form.discountKind, form.discountValue] as const,
  () => {
    clearTimeout(timer)
    if (!props.open || !unitId.value || !form.moved_in_on) return
    timer = setTimeout(requote, 300)
  },
)

async function requote() {
  if (!unitId.value) return
  const discount = discountOf(form)
  try {
    const q = await tenancyService.preview(props.property.id, {
      unit_id: unitId.value,
      moved_in_on: form.moved_in_on,
      ...(discount ? { discount_kind: discount.kind, discount_value: discount.value } : {}),
    })
    quote.value = q
    quoteError.value = ''
    // Fill what is owed, until the amount has been typed by hand.
    if (!typed.deposit) form.deposit.amount = q.deposit_centavos ? toPesoInput(q.deposit_centavos) : ''
    if (!typed.firstRent) form.firstRent.amount = q.first_rent_centavos ? toPesoInput(q.first_rent_centavos) : ''
  } catch (e) {
    quote.value = null
    quoteError.value = firstError(e)
  }
}

async function submit() {
  if (!unitId.value) return toast.error('Choose a room or bedspace.')
  if (!props.application && !email.value.trim()) return toast.error('Enter the email of their BoardMate account.')
  if (!form.emergency.name.trim() || !form.emergency.phone.trim()) return toast.error('Add an emergency contact for the tenant.')
  if (override.value && form.overrideReason.trim().length < 3) return toast.error('Give a reason for moving in without the full deposit and first rent.')
  if (leads.value && !form.leaderConsent) return toast.error('Confirm that the tenant agreed to be the room\'s leader.')

  busy.value = true
  try {
    const body = buildMoveIn(form, { whole: !!whole.value })
    const result = props.application
      ? await tenancyService.moveIn(props.application.id, body)
      : await tenancyService.moveInWalkIn(props.property.id, { ...body, unit_id: unitId.value, email: email.value.trim() })
    emit('done', result.message, result.tenancy)
  } catch (e) {
    toast.error(firstError(e) || errorMessage(e))
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
.quote .line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 0;
}
.error {
  color: var(--ion-color-danger);
}
.payment {
  margin-top: 12px;
}
.person {
  margin: 8px 0;
}
</style>
