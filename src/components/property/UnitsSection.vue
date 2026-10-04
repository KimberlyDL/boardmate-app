<template>
  <div>
    <p class="muted">
      {{ property.rental_mode_label }} · {{ property.counts.available }} of {{ property.counts.units }} available
      <span v-if="property.counts.not_ready"> · {{ property.counts.not_ready }} not ready</span>
    </p>

    <ion-list>
      <ion-item v-for="unit in property.units" :key="unit.id">
        <ion-label class="ion-text-wrap">
          <h2>{{ unit.label }}</h2>
          <p>
            <strong>{{ unit.rent_centavos === null ? 'No rent set' : `${peso(unit.rent_centavos)} / month` }}</strong>
            <span v-if="unit.kind === 'whole'"> · up to {{ unit.capacity }} occupants</span>
          </p>
          <p v-if="unit.upcoming_rent" class="upcoming">
            {{ peso(unit.upcoming_rent.amount_centavos) }} from {{ manila(unit.upcoming_rent.effective_from).format('MMM D, YYYY') }}
          </p>
          <p>
            <ion-badge :color="unit.status === 'available' ? 'success' : 'medium'">{{ unit.status_label }}</ion-badge>
            <ion-badge v-if="unit.not_ready" color="warning" class="gap">Not ready</ion-badge>
            <span v-if="unit.not_ready_reason" class="muted"> {{ unit.not_ready_reason }}</span>
          </p>
          <p v-if="unit.reservation" class="reserved">
            Reserved for {{ unit.reservation.boarder_name }} until {{ manila(unit.reservation.reserved_until).format('MMM D, YYYY') }}
            · <router-link to="/applications">Applications</router-link>
          </p>
        </ion-label>
        <ion-buttons v-if="canEdit || canPrice" slot="end">
          <ion-button aria-label="Unit actions" @click="openActions(unit)">
            <ion-icon slot="icon-only" :icon="ellipsisVertical" />
          </ion-button>
        </ion-buttons>
      </ion-item>
    </ion-list>

    <template v-if="canEdit">
      <ion-card v-if="property.rental_mode === 'bedspaces'">
        <ion-card-content>
          <strong>Add bedspaces</strong>
          <div class="row">
            <ion-input v-model.number="add.count" type="number" min="1" label="How many" label-placement="stacked" fill="outline" />
            <ion-input v-model="add.pattern" label="Label ({n} = number)" label-placement="stacked" fill="outline" />
          </div>
          <ion-input v-model="add.rent" inputmode="decimal" label="Rent each (₱ / month)" label-placement="stacked" fill="outline" class="ion-margin-top" />
          <ion-button expand="block" class="form-actions" :disabled="busy" @click="addBedspaces">Add</ion-button>
        </ion-card-content>
      </ion-card>
      <ion-button expand="block" fill="clear" size="small" @click="switchMode">
        Switch to {{ property.rental_mode === 'whole' ? 'renting by bedspace' : 'renting the whole property' }}
      </ion-button>
    </template>

    <!-- Rent history -->
    <ion-modal :is-open="!!history" @did-dismiss="history = null">
      <ion-header>
        <ion-toolbar>
          <ion-title>Rent history</ion-title>
          <ion-buttons slot="end"><ion-button @click="history = null">Close</ion-button></ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <ion-list>
          <ion-item v-for="rule in history ?? []" :key="rule.id">
            <ion-label>
              <h2>{{ peso(rule.amount_centavos) }}</h2>
              <p>
                {{ manila(rule.effective_from).format('MMM D, YYYY') }} –
                {{ rule.effective_to ? manila(rule.effective_to).format('MMM D, YYYY') : 'onwards' }}
              </p>
              <p class="muted">Set by {{ rule.set_by ?? '—' }}</p>
            </ion-label>
            <ion-badge slot="end" :color="rule.state === 'current' ? 'success' : rule.state === 'scheduled' ? 'primary' : 'medium'">
              {{ rule.state }}
            </ion-badge>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  alertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { ellipsisVertical } from 'ionicons/icons'
import { computed, reactive, ref } from 'vue'
import { manila } from '@/lib/dayjs'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { errorMessage, fieldErrors } from '@/services/api'
import { propertyService } from '@/services/properties'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { PriceRule, Property, Unit } from '@/types/property'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ changed: [] }>()

const toast = useToast()
const prompt = usePrompt()
const canEdit = computed(() => props.property.abilities.includes('manage_units'))
const canPrice = computed(() => props.property.abilities.includes('manage_prices'))
const busy = ref(false)
const history = ref<PriceRule[] | null>(null)
const add = reactive({ count: 1, pattern: 'Bed {n}', rent: '' })

function fail(e: unknown) {
  const fields = fieldErrors(e)
  toast.error(Object.values(fields)[0]?.[0] ?? errorMessage(e))
}

async function run(action: () => Promise<unknown>, success?: string) {
  busy.value = true
  try {
    await action()
    if (success) toast.success(success)
    emit('changed')
  } catch (e) {
    fail(e)
  } finally {
    busy.value = false
  }
}

async function openActions(unit: Unit) {
  const buttons = []
  if (canPrice.value) {
    buttons.push({ text: 'Change rent', handler: () => changeRent(unit) })
  }
  buttons.push({ text: 'Rent history', handler: () => showHistory(unit) })
  if (canEdit.value) {
    buttons.push({ text: unit.not_ready ? 'Mark ready' : 'Mark not ready', handler: () => toggleReady(unit) })
    buttons.push({ text: unit.kind === 'whole' ? 'Change max occupants' : 'Rename', handler: () => editUnit(unit) })
    if (unit.kind === 'bedspace') buttons.push({ text: 'Remove', role: 'destructive', handler: () => removeUnit(unit) })
  }
  buttons.push({ text: 'Cancel', role: 'cancel' })
  const sheet = await actionSheetController.create({ header: unit.label, buttons })
  await sheet.present()
}

async function changeRent(unit: Unit) {
  const alert = await alertController.create({
    header: `Rent for ${unit.label}`,
    message: 'The current rent stays for earlier days. Pick when the new rent starts.',
    inputs: [
      { name: 'amount', type: 'text', placeholder: 'Amount in ₱', value: toPesoInput(unit.rent_centavos), attributes: { inputmode: 'decimal' } },
      { name: 'from', type: 'date', value: manila().format('YYYY-MM-DD'), min: manila().format('YYYY-MM-DD') },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  const amount = toCentavos(data?.values?.amount)
  if (amount === null) return toast.error('Enter the rent in pesos, e.g. 1800.')
  await run(() => propertyService.setRent(unit.id, amount, data?.values?.from), 'Rent saved.')
}

async function showHistory(unit: Unit) {
  try {
    history.value = await propertyService.unitPriceHistory(unit.id)
  } catch (e) {
    fail(e)
  }
}

async function toggleReady(unit: Unit) {
  if (unit.not_ready) {
    return run(() => propertyService.setNotReady(unit.id, false), `${unit.label} is ready.`)
  }
  const reason = await prompt.reason('Not ready', 'What needs doing? Boarders will not be able to book it until you mark it ready.', 'Mark not ready')
  if (reason) await run(() => propertyService.setNotReady(unit.id, true, reason))
}

async function editUnit(unit: Unit) {
  const whole = unit.kind === 'whole'
  const alert = await alertController.create({
    header: whole ? 'Max occupants' : 'Rename',
    inputs: [whole ? { name: 'v', type: 'number', value: unit.capacity, min: 1 } : { name: 'v', type: 'text', value: unit.label }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm' || !data?.values?.v) return
  await run(() => propertyService.updateUnit(unit.id, whole ? { capacity: Number(data.values.v) } : { label: String(data.values.v) }))
}

async function removeUnit(unit: Unit) {
  if (!(await prompt.confirm('Remove bedspace?', `${unit.label} will be archived with its rent history.`, 'Remove'))) return
  await run(() => propertyService.removeUnit(unit.id), `${unit.label} removed.`)
}

async function addBedspaces() {
  const rent = add.rent ? toCentavos(add.rent) : null
  if (add.rent && rent === null) return toast.error('Enter the rent in pesos, e.g. 1800.')
  await run(async () => {
    await propertyService.addBedspaces(props.property.id, { count: add.count, label_pattern: add.pattern, rent_centavos: rent })
    add.count = 1
  }, 'Bedspaces added.')
}

async function switchMode() {
  const toWhole = props.property.rental_mode === 'bedspaces'
  const alert = await alertController.create({
    header: toWhole ? 'Rent the whole property' : 'Rent by bedspace',
    message: 'The current units are archived with their rent history. Not allowed while anyone is booked or living there.',
    inputs: toWhole
      ? [
          { name: 'capacity', type: 'number', placeholder: 'Max occupants', min: 1 },
          { name: 'rent', type: 'text', placeholder: 'Monthly rent in ₱', attributes: { inputmode: 'decimal' } },
        ]
      : [
          { name: 'count', type: 'number', placeholder: 'How many bedspaces', min: 1 },
          { name: 'rent', type: 'text', placeholder: 'Rent each in ₱', attributes: { inputmode: 'decimal' } },
        ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Switch', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  const v = data?.values ?? {}
  const rent = v.rent ? toCentavos(v.rent) : null
  await run(
    () =>
      propertyService.switchMode(
        props.property.id,
        toWhole ? 'whole' : 'bedspaces',
        toWhole ? { capacity: Number(v.capacity) || 1, rent_centavos: rent } : { count: Number(v.count) || 1, rent_centavos: rent },
      ),
    'Rental mode changed.',
  )
}
</script>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 8px;
  margin-top: 8px;
}
.upcoming {
  color: var(--ion-color-primary);
}
.reserved {
  color: var(--ion-color-tertiary);
}
.gap {
  margin-left: 4px;
}
</style>
