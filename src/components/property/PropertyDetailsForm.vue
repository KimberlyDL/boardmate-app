<template>
  <div>
    <template v-if="part !== 'location'">
      <ion-input
        v-model="model.name"
        label="Property name"
        label-placement="stacked"
        fill="outline"
        placeholder="e.g. Santos Boarding House"
        :readonly="readonly"
        :class="{ 'ion-invalid ion-touched': errors.name }"
        :error-text="errors.name?.[0]"
      />
      <ion-select
        v-model="model.type"
        label="Type of place"
        label-placement="stacked"
        fill="outline"
        interface="popover"
        class="ion-margin-top"
        :disabled="readonly"
      >
        <ion-select-option v-for="(label, value) in PropertyTypeLabels" :key="value" :value="value">{{ label }}</ion-select-option>
      </ion-select>

      <ion-select
        v-if="buildings.length || !readonly"
        v-model="model.building_id"
        label="Building (optional)"
        label-placement="stacked"
        fill="outline"
        interface="popover"
        class="ion-margin-top"
        :disabled="readonly"
        @ion-change="onBuilding($event.detail.value)"
      >
        <ion-select-option :value="null">None</ion-select-option>
        <ion-select-option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</ion-select-option>
        <ion-select-option v-if="!readonly" value="__new">+ New building…</ion-select-option>
      </ion-select>

      <ion-textarea
        v-model="model.description"
        label="Description"
        label-placement="stacked"
        fill="outline"
        :auto-grow="true"
        :rows="3"
        :counter="true"
        :maxlength="3000"
        class="ion-margin-top"
        :readonly="readonly"
        placeholder="What is it like, what is nearby, what is included…"
      />

      <p class="label">Who can apply <span class="muted">(shown on the listing, not enforced)</span></p>
      <div class="chips">
        <ion-chip
          v-for="option in WHO_OPTIONS"
          :key="option"
          :outline="model.who_can_apply !== option"
          :color="model.who_can_apply === option ? 'primary' : undefined"
          :disabled="readonly"
          @click="model.who_can_apply = model.who_can_apply === option ? null : option"
        >
          {{ option }}
        </ion-chip>
      </div>
      <ion-input
        v-model="model.who_can_apply"
        label="Or type your own"
        label-placement="stacked"
        fill="outline"
        :readonly="readonly"
        placeholder="e.g. Female students only"
      />
    </template>

    <template v-if="part !== 'details'">
      <ion-input v-model="model.street" label="Street and number" label-placement="stacked" fill="outline" :readonly="readonly" class="ion-margin-top" />
      <ion-input v-model="model.barangay" label="Barangay" label-placement="stacked" fill="outline" :readonly="readonly" class="ion-margin-top" />
      <ion-input v-model="model.city" label="City or municipality" label-placement="stacked" fill="outline" :readonly="readonly" class="ion-margin-top" />
      <ion-input v-model="model.province" label="Province" label-placement="stacked" fill="outline" :readonly="readonly" class="ion-margin-top" />
      <p class="label">Map pin</p>
      <map-picker v-if="!readonly" v-model="pin" />
      <p v-else class="muted">{{ pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : 'Not pinned' }}</p>
      <ion-note v-if="errors.latitude" color="danger">{{ errors.latitude[0] }}</ion-note>
    </template>
  </div>
</template>

<script setup lang="ts">
import { alertController, IonChip, IonInput, IonNote, IonSelect, IonSelectOption, IonTextarea } from '@ionic/vue'
import { computed, onMounted, ref } from 'vue'
import MapPicker, { type LatLng } from '@/components/MapPicker.vue'
import { errorMessage } from '@/services/api'
import { propertyService, type PropertyDetailsInput } from '@/services/properties'
import { useToast } from '@/composables/useToast'
import { PropertyTypeLabels } from '@/types/enums'
import type { Building } from '@/types/property'

/**
 * Property details and location. `part` shows only one half (wizard steps);
 * omit it to show both (property page).
 */
const model = defineModel<PropertyDetailsInput>({ required: true })
defineProps<{ part?: 'details' | 'location'; readonly?: boolean; errors: Record<string, string[]> }>()

const WHO_OPTIONS = ['Female only', 'Male only', 'Students', 'Working professionals', 'Couples welcome', 'Anyone']

const toast = useToast()
const buildings = ref<Building[]>([])

const pin = computed<LatLng | null>({
  get: () => (model.value.latitude != null && model.value.longitude != null ? { lat: model.value.latitude, lng: model.value.longitude } : null),
  set: (v) => {
    model.value.latitude = v ? Number(v.lat.toFixed(7)) : null
    model.value.longitude = v ? Number(v.lng.toFixed(7)) : null
  },
})

onMounted(async () => {
  try {
    buildings.value = await propertyService.buildings()
  } catch {
    // Caretakers cannot list buildings; the field just stays empty.
  }
})

async function onBuilding(value: unknown) {
  if (value !== '__new') return
  model.value.building_id = null
  const alert = await alertController.create({
    header: 'New building',
    message: 'A label that groups several of your properties.',
    inputs: [{ name: 'name', placeholder: 'e.g. Sampaloc compound' }],
    buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Add', role: 'confirm' }],
  })
  await alert.present()
  const { role, data } = await alert.onDidDismiss()
  const name = (data?.values?.name ?? '').trim()
  if (role !== 'confirm' || !name) return
  try {
    const building = await propertyService.addBuilding(name)
    buildings.value.push(building)
    model.value.building_id = building.id
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.label {
  margin: 18px 0 6px;
  font-weight: 500;
}
.chips {
  margin-bottom: 8px;
}
</style>
