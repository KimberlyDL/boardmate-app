<template>
  <ion-modal :is-open="!!application" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>Reserve for {{ application?.applicant?.name }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p class="muted">Choose the room or bedspace to hold for {{ firstName }}.</p>

        <ion-radio-group v-model="unitId">
          <ion-item v-for="u in units" :key="u.id">
            <ion-radio :value="u.id" label-placement="end" justify="start" class="ion-text-wrap">
              {{ u.room_code ? `Room ${u.room_code} · ` : '' }}{{ u.label }} · {{ peso(u.rent_centavos) }}
              <span v-if="u.kind === 'whole'" class="muted"> · up to {{ u.capacity }} people</span>
            </ion-radio>
          </ion-item>
        </ion-radio-group>

        <!-- A room rented whole: the applicant leads it; note who else will stay -->
        <template v-if="unit?.kind === 'whole'">
          <h3>Who else will stay?</h3>
          <p class="muted">
            {{ application?.applicant?.name }} rents the room and will be its leader. Add the others now, or later when they move in.
            The room fits {{ unit.capacity }}, counting {{ firstName }}.
          </p>
          <ion-item v-for="(person, i) in occupants" :key="i">
            <ion-input v-model="person.name" label="Name" label-placement="stacked" :maxlength="120" />
            <ion-button slot="end" fill="clear" color="medium" aria-label="Remove" @click="occupants.splice(i, 1)">
              <ion-icon slot="icon-only" :icon="closeOutline" />
            </ion-button>
          </ion-item>
          <ion-button v-if="occupants.length + 1 < unit.capacity" fill="outline" size="small" class="add" @click="occupants.push({ name: '' })">
            Add a person
          </ion-button>
        </template>

        <!-- A bedspace room with no leader yet -->
        <ion-item v-else-if="unit && !unit.room_has_leader" lines="none" class="leader">
          <ion-toggle :checked="leader" @ion-change="leader = $event.detail.checked">
            <span class="ion-text-wrap">Make {{ firstName }} the leader of this room</span>
          </ion-toggle>
        </ion-item>
        <p v-if="unit && unit.kind === 'bedspace' && !unit.room_has_leader" class="muted small">
          The leader is billed for the room's shared utility bills. You record their consent when they move in.
        </p>

        <ion-button expand="block" class="form-actions" :disabled="busy || !unitId" @click="approve">Reserve</ion-button>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonModal,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'
import { computed, ref, watch } from 'vue'
import { peso } from '@/lib/money'
import { firstError } from '@/services/api'
import { bookingService } from '@/services/bookings'
import { useToast } from '@/composables/useToast'
import type { BookableUnit, BookingApplication } from '@/types/booking'
import type { PlannedOccupant } from '@/types/tenancy'

/** Owner or Manager picks the unit for an application; for a whole room also who will stay, for a bedspace who leads. */
const props = defineProps<{ application: BookingApplication | null; units: BookableUnit[] }>()
const emit = defineEmits<{ close: []; approved: [message: string] }>()

const toast = useToast()
const busy = ref(false)
const unitId = ref<number | null>(null)
const leader = ref(false)
const occupants = ref<PlannedOccupant[]>([])

const unit = computed(() => props.units.find((u) => u.id === unitId.value) ?? null)
const firstName = computed(() => props.application?.applicant?.name.split(' ')[0] ?? 'the applicant')

watch(
  () => props.application,
  (a) => {
    if (!a) return
    unitId.value = props.units[0]?.id ?? null
    leader.value = false
    occupants.value = []
  },
)

// Switching units clears what only made sense for the previous kind.
watch(unitId, () => {
  leader.value = false
  occupants.value = []
})

async function approve() {
  if (!props.application || !unitId.value) return
  busy.value = true
  try {
    const extras: { leader?: boolean; occupants?: PlannedOccupant[] } = {}
    if (unit.value?.kind === 'whole') {
      extras.occupants = occupants.value.filter((o) => o.name.trim() !== '').map((o) => ({ name: o.name.trim() }))
    } else if (leader.value) {
      extras.leader = true
    }
    emit('approved', await bookingService.approve(props.application.id, unitId.value, extras))
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.add {
  margin: 8px 0;
}
.leader {
  margin-top: 12px;
}
.small {
  font-size: 0.85rem;
}
</style>
