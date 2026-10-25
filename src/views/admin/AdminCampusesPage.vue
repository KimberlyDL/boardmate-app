<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Campuses</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="edit(null)"><Plus slot="start" :size="18" aria-hidden="true" /> Add</ion-button>
        </ion-buttons>
        <ion-buttons slot="end"><NotificationBell /></ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="narrow">
        <p class="ion-padding-horizontal muted">
          The Dorm Finder shows how far each place is from a campus. Boarders start from the default campus and can switch.
        </p>
        <p v-if="!loading && !campuses.length" class="ion-padding muted center">No campuses yet. Add the first one; it becomes the default.</p>

        <ion-list>
          <ion-item v-for="c in campuses" :key="c.id">
            <ion-label class="ion-text-wrap">
              <h2>{{ c.name }}</h2>
              <p class="muted">{{ c.latitude.toFixed(5) }}, {{ c.longitude.toFixed(5) }}</p>
            </ion-label>
            <ion-badge v-if="c.is_default" slot="end" color="success">Default</ion-badge>
            <ion-buttons slot="end">
              <ion-button aria-label="Campus actions" @click="actions(c)"><EllipsisVertical slot="icon-only" :size="20" aria-hidden="true" /></ion-button>
            </ion-buttons>
          </ion-item>
        </ion-list>
      </div>

      <ion-modal :is-open="!!form" @did-dismiss="form = null">
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start"><ion-button @click="form = null">Cancel</ion-button></ion-buttons>
            <ion-title>{{ form?.id ? 'Change campus' : 'Add campus' }}</ion-title>
            <ion-buttons slot="end"><ion-button :strong="true" :disabled="saving" @click="save">Save</ion-button></ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content v-if="form" class="ion-padding">
          <ion-input v-model="form.name" label="Name" label-placement="stacked" fill="outline" placeholder="e.g. Main Campus" :maxlength="120" />
          <h3>Location</h3>
          <map-picker v-model="form.pin" />
        </ion-content>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  actionSheetController,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { EllipsisVertical, Plus } from 'lucide-vue-next'
import { ref } from 'vue'
import MapPicker, { type LatLng } from '@/components/MapPicker.vue'
import NotificationBell from '@/components/NotificationBell.vue'
import { adminService } from '@/services/admin'
import { errorMessage, fieldErrors } from '@/services/api'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Campus } from '@/types/booking'

const toast = useToast()
const prompt = usePrompt()

const campuses = ref<Campus[]>([])
const loading = ref(false)
const saving = ref(false)
const form = ref<{ id: number | null; name: string; pin: LatLng | null } | null>(null)

function fail(e: unknown) {
  toast.error(Object.values(fieldErrors(e))[0]?.[0] ?? errorMessage(e))
}

async function load() {
  loading.value = true
  try {
    campuses.value = await adminService.campuses()
  } catch (e) {
    fail(e)
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

function edit(c: Campus | null) {
  form.value = c ? { id: c.id, name: c.name, pin: { lat: c.latitude, lng: c.longitude } } : { id: null, name: '', pin: null }
}

async function save() {
  if (!form.value) return
  const { id, name, pin } = form.value
  if (!name.trim()) return toast.error('Enter the campus name.')
  if (!pin) return toast.error('Tap the map where the campus is.')
  saving.value = true
  try {
    const input = { name: name.trim(), latitude: Number(pin.lat.toFixed(7)), longitude: Number(pin.lng.toFixed(7)) }
    const { items, message } = id ? await adminService.updateCampus(id, input) : await adminService.addCampus(input)
    campuses.value = items
    toast.success(message)
    form.value = null
  } catch (e) {
    fail(e)
  } finally {
    saving.value = false
  }
}

async function run(action: () => Promise<{ items: Campus[]; message: string }>) {
  try {
    const { items, message } = await action()
    campuses.value = items
    toast.success(message)
  } catch (e) {
    fail(e)
  }
}

async function actions(c: Campus) {
  const buttons = [
    { text: 'Change name or location', handler: () => edit(c) },
    ...(c.is_default ? [] : [{ text: 'Make default', handler: () => void run(() => adminService.updateCampus(c.id, { is_default: true })) }]),
    {
      text: 'Remove',
      role: 'destructive',
      handler: () =>
        void prompt
          .confirm('Remove campus?', `${c.name} will no longer be offered on the Dorm Finder.`, 'Remove')
          .then((ok) => (ok ? run(() => adminService.removeCampus(c.id)) : undefined)),
    },
    { text: 'Cancel', role: 'cancel' },
  ]
  const sheet = await actionSheetController.create({ header: c.name, buttons })
  await sheet.present()
}
</script>

<style scoped>
h3 {
  font-size: 0.95rem;
  margin: 18px 0 8px;
}
</style>
