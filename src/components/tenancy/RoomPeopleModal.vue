<template>
  <ion-modal :is-open="!!room" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Room {{ room?.code }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Close</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p v-if="loading" class="muted">Loading…</p>

        <template v-else>
          <!-- Leader -->
          <h3>Room leader</h3>
          <ion-item lines="none">
            <ion-label class="ion-text-wrap">
              <h2>{{ leader ? leader.user.name : 'No leader yet' }}</h2>
              <p v-if="leader">Since {{ manilaDate(leader.started_on).format('MMM D, YYYY') }}</p>
              <p class="muted">The leader is billed for the room's shared bills and manages its group.</p>
            </ion-label>
            <ion-button v-if="staff && canManage && !whole" slot="end" size="small" fill="outline" @click="chooseLeader">
              {{ leader ? 'Change' : 'Choose' }}
            </ion-button>
          </ion-item>
          <p v-if="whole && staff" class="muted small">In a room rented whole, the person who rents it is the leader.</p>

          <!-- Bedspace room: the people who live here -->
          <template v-if="!whole && staff">
            <h3>Who lives here</h3>
            <p v-if="!members.length" class="muted">Nobody has moved in yet.</p>
            <ion-list v-else lines="full">
              <ion-item v-for="m in members" :key="m.id">
                <ion-label>
                  <h2>{{ m.tenant.name }} <ion-badge v-if="m.tenant.id === leader?.user.id" color="tertiary">Leader</ion-badge></h2>
                  <p>{{ m.unit.label }} · moved in {{ manilaDate(m.moved_in_on).format('MMM D, YYYY') }}</p>
                </ion-label>
              </ion-item>
            </ion-list>
          </template>

          <!-- Rooms rented whole: who stays -->
          <template v-if="whole">
            <h3>Who stays ({{ staying.length }})</h3>
            <p v-if="!occupants.length" class="muted">Nobody is listed yet.</p>
            <ion-list v-else lines="full">
              <ion-item v-for="o in occupants" :key="o.id">
                <ion-label class="ion-text-wrap">
                  <h2>
                    {{ o.name }}
                    <ion-badge v-if="o.is_leader_holder" color="tertiary">Leader</ion-badge>
                    <ion-badge v-if="!o.is_staying" color="medium">Left</ion-badge>
                  </h2>
                  <p>
                    From {{ manilaDate(o.joined_on).format('MMM D, YYYY') }}<template v-if="o.left_on"> to {{ manilaDate(o.left_on).format('MMM D, YYYY') }}</template>
                    <template v-if="o.contact_phone"> · {{ o.contact_phone }}</template>
                  </p>
                  <p v-if="o.emergency_contact" class="muted">
                    Emergency: {{ o.emergency_contact.name }}<template v-if="o.emergency_contact.relationship"> ({{ o.emergency_contact.relationship }})</template>
                    · {{ o.emergency_contact.phone }}
                  </p>
                </ion-label>
                <ion-buttons v-if="canManage && !o.is_leader_holder" slot="end">
                  <ion-button v-if="o.is_staying" size="small" fill="clear" @click="markLeft(o)">Left</ion-button>
                  <ion-button v-else-if="staff" size="small" fill="clear" @click="bringBack(o)">Back</ion-button>
                  <ion-button v-if="staff" size="small" fill="clear" color="danger" @click="remove(o)">Remove</ion-button>
                </ion-buttons>
              </ion-item>
            </ion-list>

            <ion-button v-if="canManage && !adding" fill="outline" size="small" class="gap" @click="startAdding">Add a person</ion-button>

            <ion-card v-if="adding" class="gap">
              <ion-card-content>
                <ion-input v-model="draft.name" label="Name" label-placement="stacked" fill="outline" :maxlength="120" />
                <div class="row">
                  <ion-input v-model="draft.contact_phone" type="tel" label="Phone (optional)" label-placement="stacked" fill="outline" />
                  <ion-input v-model="draft.joined_on" type="date" :max="today" label="Joined on" label-placement="stacked" fill="outline" />
                </div>
                <ion-input v-model="draft.email" type="email" label="BoardMate account email (optional)" label-placement="stacked" fill="outline" class="gap" />
                <ion-input v-model="draft.emergency_contact_name" label="Emergency contact" label-placement="stacked" fill="outline" class="gap" />
                <div class="row">
                  <ion-input v-model="draft.emergency_contact_relationship" label="Relationship" label-placement="stacked" fill="outline" />
                  <ion-input v-model="draft.emergency_contact_phone" type="tel" label="Contact phone" label-placement="stacked" fill="outline" />
                </div>
                <ion-button class="gap" :disabled="busy" @click="add">Add</ion-button>
                <ion-button fill="clear" color="medium" @click="adding = false">Cancel</ion-button>
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
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, reactive, ref, watch } from 'vue'
import { manila, manilaDate } from '@/lib/dayjs'
import { firstError } from '@/services/api'
import { tenancyService } from '@/services/tenancies'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Room } from '@/types/property'
import type { NewOccupantInput, RoomLeader, RoomOccupant, Tenancy } from '@/types/tenancy'

/**
 * A room's leader and the people in it. `staff`: the owner or a caretaker of the
 * property (sees emergency contacts; `canManage` = may change things). Otherwise
 * the room's leader, who can add people and mark them as left.
 */
const props = defineProps<{ room: Pick<Room, 'id' | 'code' | 'rental_mode'> | null; propertyId: number; staff: boolean; canManage: boolean }>()
const emit = defineEmits<{ close: []; changed: [] }>()

const toast = useToast()
const prompt = usePrompt()
const loading = ref(false)
const busy = ref(false)
const leader = ref<RoomLeader | null>(null)
const occupants = ref<RoomOccupant[]>([])
const members = ref<Tenancy[]>([])
const adding = ref(false)
const today = ref(manila().format('YYYY-MM-DD'))
const draft = reactive<NewOccupantInput>(blankDraft())

const whole = computed(() => props.room?.rental_mode === 'whole')
const staying = computed(() => occupants.value.filter((o) => o.is_staying))

function blankDraft(): NewOccupantInput {
  return { name: '', contact_phone: '', email: '', joined_on: manila().format('YYYY-MM-DD'), emergency_contact_name: '', emergency_contact_relationship: '', emergency_contact_phone: '' }
}

async function load() {
  if (!props.room) return
  loading.value = true
  try {
    leader.value = await tenancyService.leader(props.room.id)
    occupants.value = whole.value ? await tenancyService.occupants(props.room.id) : []
    members.value = !whole.value && props.staff ? (await tenancyService.list(props.propertyId, props.room.id)).items : []
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
}

watch(
  () => props.room,
  (r) => {
    adding.value = false
    if (r) load()
  },
)

/** Run a change, then refresh this sheet and tell the screen behind it. */
async function run(action: () => Promise<unknown>, success: string) {
  busy.value = true
  try {
    await action()
    toast.success(success)
    await load()
    emit('changed')
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}

async function chooseLeader() {
  if (!props.room) return
  const candidates = members.value.filter((m) => m.tenant.id !== leader.value?.user.id)
  if (!candidates.length) return toast.info('Nobody else lives in this room yet.')

  const alert = await alertController.create({
    header: 'Choose the leader',
    message: 'Pick someone who lives in this room.',
    inputs: candidates.map((m, i) => ({ type: 'radio' as const, label: m.tenant.name, value: m.tenant.id, checked: i === 0 })),
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Next', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm' || !data?.values) return
  const chosen = candidates.find((m) => m.tenant.id === Number(data.values))
  if (!chosen) return
  if (!(await prompt.confirm('Did they agree?', `${chosen.tenant.name} agreed to be the leader of room ${props.room.code}: billed for its shared bills. Your approval is recorded.`, 'Yes, appoint'))) return
  await run(() => tenancyService.setLeader(props.room!.id, chosen.tenant.id), `${chosen.tenant.name} is the leader.`)
}

function startAdding() {
  Object.assign(draft, blankDraft())
  adding.value = true
}

async function add() {
  if (!props.room) return
  if (!draft.name.trim()) return toast.error('Enter their name.')
  const input: NewOccupantInput = {
    name: draft.name.trim(),
    joined_on: draft.joined_on,
    emergency_contact_name: draft.emergency_contact_name.trim(),
    emergency_contact_phone: draft.emergency_contact_phone.trim(),
  }
  if (draft.contact_phone?.trim()) input.contact_phone = draft.contact_phone.trim()
  if (draft.email?.trim()) input.email = draft.email.trim()
  if (draft.emergency_contact_relationship?.trim()) input.emergency_contact_relationship = draft.emergency_contact_relationship.trim()

  await run(async () => {
    await tenancyService.addOccupant(props.room!.id, input)
    adding.value = false
  }, `${input.name} added.`)
}

async function markLeft(o: RoomOccupant) {
  const alert = await alertController.create({
    header: `${o.name} left`,
    message: 'The last day they stayed.',
    inputs: [{ name: 'on', type: 'date', value: today.value, min: o.joined_on, max: today.value }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Save', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  if (role !== 'confirm' || !data?.values?.on) return
  await run(() => tenancyService.updateOccupant(o.id, { left_on: data.values.on }), `${o.name} marked as left.`)
}

async function bringBack(o: RoomOccupant) {
  await run(() => tenancyService.updateOccupant(o.id, { left_on: null }), `${o.name} is back.`)
}

async function remove(o: RoomOccupant) {
  if (!(await prompt.confirm('Remove from the list?', `${o.name} is deleted from the room's list. Use "Left" instead to keep the history.`, 'Remove'))) return
  await run(() => tenancyService.removeOccupant(o.id), `${o.name} removed.`)
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
</style>
