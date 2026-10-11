<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="`/listings/${id}`" /></ion-buttons>
        <ion-title>Apply</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form class="narrow" @submit.prevent="submit">
        <p v-if="listingName">Applying for <strong>{{ listingName }}</strong>. No reservation fee.</p>

        <template v-if="rooms.length > 1">
          <p class="label">Room</p>
          <p class="muted small">The owner may place you in another room if this one is taken first.</p>
          <ion-radio-group v-model="form.room_id">
            <ion-item v-for="r in rooms" :key="r.id" :disabled="r.status !== 'available'" lines="inset">
              <ion-radio :value="r.id" label-placement="end" justify="start" class="ion-text-wrap">
                <strong>Room {{ r.label }}</strong>
                <span class="muted"> · {{ r.floor === null ? 'no floor set' : `floor ${r.floor}` }}</span><br />
                <span class="small">
                  {{ r.status === 'available' ? r.availability_label : r.status === 'full' ? 'Full' : 'Not ready' }}
                  <template v-if="r.rent_from_centavos !== null"> · {{ peso(r.rent_from_centavos) }} / month</template>
                  <template v-if="r.who_can_stay !== 'any'"> · {{ r.who_can_stay_label }}</template>
                </span>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
          <ion-note v-if="errors.room_id" color="danger" class="block">{{ errors.room_id[0] }}</ion-note>
        </template>
        <template v-if="chosen?.whole_option">
          <p class="label">Rent</p>
          <ion-segment v-model="rentAs">
            <ion-segment-button value="bed" :disabled="chosen.available === 0"><ion-label>A bedspace</ion-label></ion-segment-button>
            <ion-segment-button value="whole" :disabled="!chosen.whole_option.available">
              <ion-label>The whole room</ion-label>
            </ion-segment-button>
          </ion-segment>
          <p v-if="rentAs === 'whole'" class="muted small">
            Room {{ chosen.label }} for up to {{ chosen.whole_option.capacity }} people at
            {{ chosen.whole_option.rent_centavos !== null ? peso(chosen.whole_option.rent_centavos) : 'the owner\'s price' }} / month. You will be its
            leader.
          </p>
          <ion-note v-if="errors.whole" color="danger" class="block">{{ errors.whole[0] }}</ion-note>
        </template>
        <ion-note v-else-if="errors.room_id" color="danger" class="block">{{ errors.room_id[0] }}</ion-note>

        <ion-input :value="auth.user?.name" label="Name" label-placement="stacked" fill="outline" readonly class="ion-margin-top" />
        <ion-input
          v-model="form.contact_phone"
          type="tel"
          label="Mobile number"
          label-placement="stacked"
          fill="outline"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.contact_phone }"
          :error-text="errors.contact_phone?.[0]"
        />
        <ion-input
          v-model="form.planned_move_in_on"
          type="date"
          :min="today"
          label="Planned move-in date"
          label-placement="stacked"
          fill="outline"
          class="ion-margin-top"
          :class="{ 'ion-invalid ion-touched': errors.planned_move_in_on }"
          :error-text="errors.planned_move_in_on?.[0]"
        />
        <ion-textarea
          v-model="form.message"
          label="Message to the owner"
          label-placement="stacked"
          fill="outline"
          :rows="3"
          :auto-grow="true"
          :counter="true"
          :maxlength="1000"
          placeholder="e.g. Student at UST, quiet, non-smoker."
          class="ion-margin-top"
        />

        <p class="label">ID (optional)</p>
        <p class="muted small">
          Only the owner and their managers can see it. It is deleted 30 days after your application closes.
        </p>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden @change="pickFile" />
        <ion-button size="small" fill="outline" @click="fileInput?.click()">{{ idFile ? 'Change file' : 'Attach ID' }}</ion-button>
        <span v-if="idFile" class="muted small"> {{ idFile.name }}</span>
        <ion-note v-if="errors.id_document" color="danger" class="block">{{ errors.id_document[0] }}</ion-note>

        <ion-button expand="block" type="submit" class="form-actions" :disabled="busy">
          <ion-spinner v-if="busy" name="crescent" />
          <span v-else>Send application</span>
        </ion-button>
      </form>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonPage,
  IonRadio,
  IonRadioGroup,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { manila } from '@/lib/dayjs'
import { peso } from '@/lib/money'
import { errorCode, errorMessage, fieldErrors } from '@/services/api'
import { bookingService } from '@/services/bookings'
import { listingService } from '@/services/listings'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import type { PublicRoom } from '@/types/booking'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const id = Number(route.params.id)
const today = manila().format('YYYY-MM-DD')
const listingName = ref('')
const rooms = ref<PublicRoom[]>([])
const chosen = computed(() => rooms.value.find((r) => r.id === form.room_id) ?? null)
// `?whole=1` comes from "Rent the whole room".
const rentAs = ref<'bed' | 'whole'>(route.query.whole === '1' ? 'whole' : 'bed')
watch(chosen, (room) => {
  if (!room?.whole_option?.available) rentAs.value = 'bed'
  else if (room.available === 0) rentAs.value = 'whole'
})
// `?room=` comes from the room tapped on "Rooms & availability".
const form = reactive({
  contact_phone: auth.user?.phone ?? '',
  planned_move_in_on: today,
  message: '',
  room_id: Number(route.query.room) || (null as number | null),
})
const idFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const errors = ref<Record<string, string[]>>({})
const busy = ref(false)

onMounted(async () => {
  try {
    const { listing } = await listingService.get(id)
    listingName.value = listing.name
    rooms.value = listing.rooms
    if (!rooms.value.some((r) => r.id === form.room_id && r.status === 'available')) {
      form.room_id = rooms.value.length === 1 ? rooms.value[0].id : null
    }
  } catch {
    // The submit will explain if the listing is gone.
  }
})

function pickFile(e: Event) {
  idFile.value = (e.target as HTMLInputElement).files?.[0] ?? null
}

async function submit() {
  busy.value = true
  errors.value = {}
  try {
    const { message } = await bookingService.apply(id, { ...form, whole: rentAs.value === 'whole', id_document: idFile.value })
    toast.success(message)
    await router.replace('/boarder/bookings')
  } catch (e) {
    errors.value = fieldErrors(e)
    if (!Object.keys(errors.value).length) toast.error(errorMessage(e))
    if (errorCode(e) === 'has_reservation') await router.replace('/boarder/bookings')
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.label {
  margin: 18px 0 4px;
  font-weight: 500;
}
.small {
  font-size: 0.85rem;
}
.block {
  display: block;
}
</style>
