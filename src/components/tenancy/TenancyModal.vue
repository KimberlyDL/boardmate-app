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
        <p v-if="loading" class="muted">Loading…</p>

        <template v-else-if="tenancy">
          <ion-card>
            <ion-card-content>
              <p>
                <strong>Room {{ tenancy.room.code }} · {{ tenancy.unit.label }}</strong><br />
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
import { useToast } from '@/composables/useToast'
import type { DiscountKind } from '@/types/enums'
import type { DiscountRow, Tenancy } from '@/types/tenancy'

/** One tenant's stay for the owner or a caretaker: what was received at move-in, the emergency contact and the agreed rate. */
const props = defineProps<{ tenancyId: number | null; canManage: boolean }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const toast = useToast()
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
</style>
