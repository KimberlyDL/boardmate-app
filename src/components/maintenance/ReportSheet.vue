<template>
  <ion-modal :is-open="open" @did-dismiss="emit('close')">
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ propertyId ? 'Log a request' : 'Report a problem' }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="emit('close')">Cancel</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <ion-select v-model="category" label="What kind of problem" label-placement="stacked" fill="outline" interface="popover">
          <ion-select-option v-for="(label, value) in MaintenanceCategoryLabels" :key="value" :value="value">{{ label }}</ion-select-option>
        </ion-select>

        <ion-select v-if="propertyId" v-model="roomId" label="Where" label-placement="stacked" fill="outline" interface="popover" class="gap">
          <ion-select-option :value="0">The whole place (shared areas)</ion-select-option>
          <ion-select-option v-for="r in rooms ?? []" :key="r.id" :value="r.id">Room {{ r.label }}</ion-select-option>
        </ion-select>

        <ion-textarea
          v-model="description"
          label="What is wrong"
          label-placement="stacked"
          fill="outline"
          class="gap"
          :rows="4"
          :auto-grow="true"
          :counter="true"
          :maxlength="2000"
          placeholder="e.g. The sink under the kitchen counter leaks when the tap is on."
        />

        <p class="label">How urgent</p>
        <ion-segment :value="urgency" @ion-change="urgency = String($event.detail.value) as MaintenanceUrgency">
          <ion-segment-button value="normal"><ion-label>Normal</ion-label></ion-segment-button>
          <ion-segment-button value="urgent"><ion-label>Urgent</ion-label></ion-segment-button>
        </ion-segment>
        <p class="muted small">Urgent: a leak, no power, no water, a safety risk. The owner and caretakers are told at once.</p>

        <p class="label">Photos (optional, up to {{ MAX_PHOTOS }})</p>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" multiple hidden @change="pickFiles" />
        <ion-button size="small" fill="outline" :disabled="photos.length >= MAX_PHOTOS" @click="fileInput?.click()">Add photos</ion-button>
        <ul v-if="photos.length" class="files">
          <li v-for="(p, i) in photos" :key="i">
            {{ p.name }} <ion-button size="small" fill="clear" color="danger" @click="photos.splice(i, 1)">Remove</ion-button>
          </li>
        </ul>

        <ion-button expand="block" class="form-actions" :disabled="busy" @click="save">{{ propertyId ? 'Log request' : 'Send request' }}</ion-button>
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
  IonLabel,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { ref, watch } from 'vue'
import { firstError } from '@/services/api'
import { maintenanceService } from '@/services/maintenance'
import { useToast } from '@/composables/useToast'
import { MaintenanceCategoryLabels, type MaintenanceCategory, type MaintenanceUrgency } from '@/types/enums'
import type { MaintenanceRequest } from '@/types/maintenance'

const MAX_PHOTOS = 4

/** A boarder reports a problem in their room; with `propertyId`, staff log one for a room or the whole place. */
const props = defineProps<{ open: boolean; propertyId?: number; rooms?: { id: number; label: string }[] }>()
const emit = defineEmits<{ close: []; done: [message: string, request: MaintenanceRequest] }>()

const toast = useToast()
const category = ref<MaintenanceCategory>('plumbing')
const urgency = ref<MaintenanceUrgency>('normal')
const description = ref('')
const roomId = ref(0)
const photos = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)

watch(() => props.open, (open) => {
  if (!open) return
  category.value = 'plumbing'
  urgency.value = 'normal'
  description.value = ''
  roomId.value = 0
  photos.value = []
})

function pickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  photos.value = [...photos.value, ...Array.from(input.files ?? [])].slice(0, MAX_PHOTOS)
  input.value = ''
}

async function save() {
  if (!description.value.trim()) return toast.error('Say what is wrong.')
  busy.value = true
  try {
    const input = { category: category.value, urgency: urgency.value, description: description.value.trim(), photos: photos.value, room_id: roomId.value || null }
    const { request, message } = props.propertyId ? await maintenanceService.log(props.propertyId, input) : await maintenanceService.report(input)
    emit('done', message, request)
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.gap {
  margin-top: 8px;
}
.label {
  margin: 16px 0 4px;
  font-weight: 500;
}
.small {
  font-size: 0.85rem;
}
.files {
  margin: 4px 0;
  padding-left: 20px;
}
</style>
