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
      <ion-textarea
        v-model="model.emergency_numbers"
        label="Emergency numbers for boarders (optional)"
        label-placement="stacked"
        fill="outline"
        :readonly="readonly"
        :rows="3"
        :auto-grow="true"
        :maxlength="500"
        placeholder="e.g. Barangay hall 8123 4567 · Police 117 · Fire 160 · Owner 0917 000 0000"
        helper-text="Shown on your boarders' home screen."
        class="ion-margin-top"
      />
    </template>

    <template v-if="part !== 'details'">
      <PlaceSelect
        v-model="model.province"
        label="Province"
        :options="provinceNames"
        :disabled="readonly"
        :error-text="errors.province?.[0] ?? placesError"
        placeholder="Choose the province"
      />
      <PlaceSelect
        v-model="model.city"
        label="City or municipality"
        :options="cityNames"
        :disabled="readonly || !model.province"
        :error-text="errors.city?.[0]"
        :placeholder="model.province ? 'Choose the city or municipality' : 'Choose the province first'"
      />
      <ion-input v-model="model.barangay" label="Barangay" label-placement="stacked" fill="outline" :readonly="readonly" class="ion-margin-top" />
      <ion-input v-model="model.street" label="Street and number" label-placement="stacked" fill="outline" :readonly="readonly" class="ion-margin-top" />
      <p class="label">Map pin</p>
      <map-picker v-if="!readonly" v-model="pin" />
      <p v-else class="muted">{{ pin ? `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : 'Not pinned' }}</p>
      <ion-note v-if="errors.latitude" color="danger">{{ errors.latitude[0] }}</ion-note>
    </template>
  </div>
</template>

<script setup lang="ts">
import { IonChip, IonInput, IonNote, IonSelect, IonSelectOption, IonTextarea } from '@ionic/vue'
import { computed, onMounted, ref, watch } from 'vue'
import MapPicker, { type LatLng } from '@/components/MapPicker.vue'
import PlaceSelect from '@/components/PlaceSelect.vue'
import { placeService, type PlaceProvince } from '@/services/places'
import type { PropertyDetailsInput } from '@/services/properties'
import { PropertyTypeLabels } from '@/types/enums'

/**
 * Property details and location. `part` shows only one half (wizard steps);
 * omit it to show both (property page).
 */
const model = defineModel<PropertyDetailsInput>({ required: true })
defineProps<{ part?: 'details' | 'location'; readonly?: boolean; errors: Record<string, string[]> }>()

const WHO_OPTIONS = ['Female only', 'Male only', 'Students', 'Working professionals', 'Couples welcome', 'Anyone']

/** The official province and city list (Phase 4): the city list follows the chosen province. */
const provinces = ref<PlaceProvince[]>([])
const placesError = ref<string | undefined>()
const provinceNames = computed(() => provinces.value.map((p) => p.name))
const cityNames = computed(() => provinces.value.find((p) => p.name === model.value.province)?.cities.map((c) => c.name) ?? [])

onMounted(async () => {
  try {
    provinces.value = await placeService.provinces()
  } catch {
    placesError.value = 'The list of places could not load. Check your connection and open this page again.'
  }
})

/** Changing to another province clears a city that is not in it (not when the form first fills in). */
watch(
  () => model.value.province,
  (province, before) => {
    if (!before || province === before || !provinces.value.length) return
    if (model.value.city && !cityNames.value.includes(model.value.city)) model.value.city = null
  },
)

const pin = computed<LatLng | null>({
  get: () => (model.value.latitude != null && model.value.longitude != null ? { lat: model.value.latitude, lng: model.value.longitude } : null),
  set: (v) => {
    model.value.latitude = v ? Number(v.lat.toFixed(7)) : null
    model.value.longitude = v ? Number(v.lng.toFixed(7)) : null
  },
})

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
