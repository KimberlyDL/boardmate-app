<template>
  <div>
    <p class="muted">
      {{ property.counts.rooms }} {{ property.counts.rooms === 1 ? 'room' : 'rooms' }} · {{ property.rental_mode_label }} ·
      {{ property.counts.available }} of {{ property.counts.units }} available
      <span v-if="property.counts.not_ready"> · {{ property.counts.not_ready }} not ready</span>
    </p>

    <template v-for="group in floors" :key="group.key">
      <h3 v-if="showFloors" class="floor">{{ group.label }}</h3>

      <ion-card v-for="room in group.rooms" :key="room.id" class="room">
        <ion-card-header>
          <div class="room-head">
            <div>
              <ion-card-title>Room {{ room.code }}</ion-card-title>
              <ion-card-subtitle>
                {{ room.rental_mode_label }} · {{ room.counts.available }} of {{ room.counts.units }} available
              </ion-card-subtitle>
            </div>
            <ion-buttons v-if="canEdit">
              <ion-button aria-label="Room actions" @click="openRoomActions(room)">
                <ion-icon slot="icon-only" :icon="ellipsisVertical" />
              </ion-button>
            </ion-buttons>
          </div>
        </ion-card-header>

        <ion-item v-if="hasPeople(room)" lines="full" button detail @click="peopleRoom = room">
          <ion-label class="ion-text-wrap">
            <h3>{{ room.leader ? `Leader: ${room.leader.user.name}` : 'No leader yet' }}</h3>
            <p v-if="room.rental_mode === 'whole'">{{ room.occupants_count ?? 0 }} staying</p>
            <p class="muted">Leader and who lives here</p>
          </ion-label>
        </ion-item>

        <ion-list lines="full">
          <ion-item v-for="unit in room.units" :key="unit.id">
            <ion-label class="ion-text-wrap">
              <h2>{{ unit.label }}</h2>
              <p>
                <strong>{{ unit.rent_centavos === null ? 'No rent set' : `${peso(unit.rent_centavos)} / month` }}</strong>
                <span v-if="unit.kind === 'whole'"> · up to {{ unit.capacity }} occupants</span>
              </p>
              <p v-if="unit.upcoming_rent" class="upcoming">
                {{ peso(unit.upcoming_rent.amount_centavos) }} from {{ manilaDate(unit.upcoming_rent.effective_from).format('MMM D, YYYY') }}
              </p>
              <p>
                <ion-badge :color="unit.status === 'available' ? 'success' : 'medium'">{{ unit.status_label }}</ion-badge>
                <ion-badge v-if="unit.not_ready" color="warning" class="gap">Not ready</ion-badge>
                <span v-if="unit.not_ready_reason" class="muted"> {{ unit.not_ready_reason }}</span>
              </p>
              <p v-if="unit.reservation" class="reserved">
                Reserved for {{ unit.reservation.boarder_name }} until {{ manilaDate(unit.reservation.reserved_until).format('MMM D, YYYY') }}
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
      </ion-card>
    </template>

    <ion-card v-if="canEdit">
      <ion-card-content>
        <strong>Add a room</strong>
        <ion-segment v-model="newRoom.mode" class="ion-margin-top">
          <ion-segment-button value="bedspaces"><ion-label>By bedspace</ion-label></ion-segment-button>
          <ion-segment-button value="whole"><ion-label>Whole room</ion-label></ion-segment-button>
        </ion-segment>
        <div class="row">
          <ion-input v-model="newRoom.floor" type="number" label="Floor (optional)" label-placement="stacked" fill="outline" />
          <ion-input
            v-if="newRoom.mode === 'bedspaces'"
            v-model.number="newRoom.count"
            type="number"
            min="1"
            label="How many bedspaces"
            label-placement="stacked"
            fill="outline"
          />
          <ion-input v-else v-model.number="newRoom.capacity" type="number" min="1" label="Max occupants" label-placement="stacked" fill="outline" />
        </div>
        <ion-input
          v-model="newRoom.rent"
          inputmode="decimal"
          :label="newRoom.mode === 'whole' ? 'Monthly rent (₱)' : 'Rent per bedspace (₱ / month)'"
          label-placement="stacked"
          fill="outline"
          class="ion-margin-top"
        />
        <ion-button expand="block" class="form-actions" :disabled="busy" @click="addRoom">Add room</ion-button>
      </ion-card-content>
    </ion-card>

    <room-people-modal
      :room="peopleRoom"
      :property-id="property.id"
      :staff="true"
      :can-manage="canManageTenancies"
      @close="peopleRoom = null"
      @changed="emit('changed')"
    />

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
                {{ manilaDate(rule.effective_from).format('MMM D, YYYY') }} –
                {{ rule.effective_to ? manilaDate(rule.effective_to).format('MMM D, YYYY') : 'onwards' }}
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
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { ellipsisVertical } from 'ionicons/icons'
import { computed, reactive, ref } from 'vue'
import { manila, manilaDate } from '@/lib/dayjs'
import { peso, toCentavos, toPesoInput } from '@/lib/money'
import { errorMessage, fieldErrors } from '@/services/api'
import RoomPeopleModal from '@/components/tenancy/RoomPeopleModal.vue'
import { propertyService } from '@/services/properties'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { PriceRule, Property, Room, Unit } from '@/types/property'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ changed: [] }>()

const toast = useToast()
const prompt = usePrompt()
const canEdit = computed(() => props.property.abilities.includes('manage_units'))
const canPrice = computed(() => props.property.abilities.includes('manage_prices'))
const canManageTenancies = computed(() => props.property.abilities.includes('manage_tenancies'))
const peopleRoom = ref<Room | null>(null)

/** Someone is booked into or lives in the room, so it has a leader and people to show. */
const hasPeople = (room: Room) => room.units.some((u) => u.status !== 'available')
const busy = ref(false)
const history = ref<PriceRule[] | null>(null)
const newRoom = reactive({ mode: 'bedspaces', floor: '', count: 4, capacity: 2, rent: '' })

/** Rooms grouped by floor; the API already orders them (no floor first, then by floor and number). */
const floors = computed(() => {
  const groups: { key: string; label: string; rooms: Room[] }[] = []
  for (const room of props.property.rooms) {
    const key = room.floor === null ? 'none' : String(room.floor)
    let group = groups.find((g) => g.key === key)
    if (!group) {
      group = { key, label: room.floor === null ? 'No floor' : `Floor ${room.floor}`, rooms: [] }
      groups.push(group)
    }
    group.rooms.push(room)
  }
  return groups
})
const showFloors = computed(() => floors.value.length > 1 || floors.value[0]?.key !== 'none')

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

function parseFloor(value: unknown): number | null | undefined {
  const text = String(value ?? '').trim()
  if (text === '') return null
  const n = Number(text)
  return Number.isInteger(n) ? n : undefined
}

async function openRoomActions(room: Room) {
  const buttons = []
  if (room.rental_mode === 'bedspaces') buttons.push({ text: 'Add bedspaces', handler: () => addBedspaces(room) })
  buttons.push({ text: 'Change floor', handler: () => changeFloor(room) })
  buttons.push({ text: room.rental_mode === 'whole' ? 'Rent by bedspace instead' : 'Rent as a whole room instead', handler: () => switchMode(room) })
  buttons.push({ text: 'Remove room', role: 'destructive', handler: () => removeRoom(room) })
  buttons.push({ text: 'Cancel', role: 'cancel' })
  const sheet = await actionSheetController.create({ header: `Room ${room.code}`, buttons })
  await sheet.present()
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

async function addRoom() {
  const rent = newRoom.rent ? toCentavos(newRoom.rent) : null
  if (newRoom.rent && rent === null) return toast.error('Enter the rent in pesos, e.g. 1800.')
  const floor = parseFloor(newRoom.floor)
  if (floor === undefined) return toast.error('The floor must be a whole number, or empty.')
  const whole = newRoom.mode === 'whole'
  await run(async () => {
    await propertyService.addRoom(props.property.id, {
      rental_mode: newRoom.mode,
      floor,
      units: whole ? { capacity: newRoom.capacity || 1, rent_centavos: rent } : { count: newRoom.count || 1, rent_centavos: rent },
    })
    newRoom.rent = ''
  }, 'Room added.')
}

async function addBedspaces(room: Room) {
  const alert = await alertController.create({
    header: `Add bedspaces to room ${room.code}`,
    inputs: [
      { name: 'count', type: 'number', placeholder: 'How many', value: 1, min: 1 },
      { name: 'rent', type: 'text', placeholder: 'Rent each in ₱ (optional)', attributes: { inputmode: 'decimal' } },
    ],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Add', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  const v = data?.values ?? {}
  const rent = v.rent ? toCentavos(v.rent) : null
  if (v.rent && rent === null) return toast.error('Enter the rent in pesos, e.g. 1800.')
  await run(() => propertyService.addBedspaces(room.id, { count: Number(v.count) || 1, rent_centavos: rent }), 'Bedspaces added.')
}

async function changeFloor(room: Room) {
  const alert = await alertController.create({
    header: `Floor of room ${room.code}`,
    message: 'Leave empty if the room has no floor. The room code changes with the floor.',
    inputs: [{ name: 'floor', type: 'number', placeholder: 'Floor', value: room.floor ?? '' }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  const floor = parseFloor(data?.values?.floor)
  if (floor === undefined) return toast.error('The floor must be a whole number, or empty.')
  await run(() => propertyService.updateRoom(room.id, { floor }), 'Floor saved.')
}

async function removeRoom(room: Room) {
  if (!(await prompt.confirm('Remove room?', `Room ${room.code} and its units will be archived with their rent history.`, 'Remove'))) return
  await run(() => propertyService.removeRoom(room.id), `Room ${room.code} removed.`)
}

async function switchMode(room: Room) {
  const toWhole = room.rental_mode === 'bedspaces'
  const alert = await alertController.create({
    header: toWhole ? `Rent room ${room.code} as a whole` : `Rent room ${room.code} by bedspace`,
    message: 'The current units are archived with their rent history. Not allowed while anyone is booked or living in the room.',
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
      propertyService.switchRoomMode(
        room.id,
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
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}
.floor {
  margin: 16px 16px 0;
}
.room-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
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
