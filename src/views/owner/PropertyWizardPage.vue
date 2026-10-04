<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/owner/properties" /></ion-buttons>
        <ion-title>Add a property</ion-title>
      </ion-toolbar>
      <ion-progress-bar :value="step / STEPS.length" />
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p class="muted">Step {{ step }} of {{ STEPS.length }} · {{ STEPS[step - 1] }}</p>

        <!-- 1–2: details and location (kept locally until the property is created) -->
        <property-details-form v-if="step === 1" v-model="details" part="details" :errors="errors" />
        <property-details-form v-else-if="step === 2" v-model="details" part="location" :errors="errors" />

        <!-- 3: units, then the property is created -->
        <template v-else-if="step === 3 && !property">
          <ion-segment v-model="mode">
            <ion-segment-button value="bedspaces"><ion-label>By bedspace</ion-label></ion-segment-button>
            <ion-segment-button value="whole"><ion-label>Whole property</ion-label></ion-segment-button>
          </ion-segment>
          <p class="muted">
            {{ mode === 'whole' ? 'Leased as a whole, e.g. to a group or a family.' : 'Each bed is rented separately.' }}
          </p>

          <template v-if="mode === 'bedspaces'">
            <ion-input v-model.number="units.count" type="number" min="1" label="How many bedspaces" label-placement="stacked" fill="outline" />
            <ion-input
              v-model="units.label_pattern"
              label="Label"
              label-placement="stacked"
              fill="outline"
              helper-text="{n} becomes the number, e.g. Room A – Bed {n}"
              class="ion-margin-top"
            />
            <p class="muted">Preview: {{ preview }}</p>
          </template>
          <ion-input
            v-else
            v-model.number="units.capacity"
            type="number"
            min="1"
            label="Maximum occupants"
            label-placement="stacked"
            fill="outline"
          />

          <ion-input
            v-model="rent"
            inputmode="decimal"
            :label="mode === 'whole' ? 'Monthly rent (₱)' : 'Monthly rent per bedspace (₱)'"
            label-placement="stacked"
            fill="outline"
            helper-text="You can set a different rent for each bed later."
            class="ion-margin-top"
          />
        </template>

        <!-- 4–7: work on the created property -->
        <utilities-section v-else-if="step === 4 && property" :property="property" @changed="reload" />
        <settings-section v-else-if="step === 5 && property" :property="property" compact />
        <photos-section v-else-if="step === 6 && property" :property="property" @updated="property = $event" />
        <template v-else-if="step === 7 && property">
          <p>
            <strong>{{ property.name }}</strong> is saved as a draft. You can change anything later from the property page.
          </p>
          <publish-card :property="property" @updated="property = $event" />
        </template>

        <div class="nav">
          <ion-button v-if="step > 1 && step !== 4" fill="outline" :disabled="busy" @click="step--">Back</ion-button>
          <ion-button v-if="step < 3" :disabled="!canContinue" @click="step++">Next</ion-button>
          <ion-button v-else-if="step === 3 && !property" :disabled="busy || !canContinue" @click="create">Create property</ion-button>
          <ion-button v-else-if="step < 7" :disabled="busy" @click="step++">Next</ion-button>
          <ion-button v-else :router-link="`/properties/${property?.id}`">Open property</ion-button>
        </div>
      </div>
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
  IonLabel,
  IonPage,
  IonProgressBar,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, reactive, ref } from 'vue'
import PhotosSection from '@/components/property/PhotosSection.vue'
import PropertyDetailsForm from '@/components/property/PropertyDetailsForm.vue'
import PublishCard from '@/components/property/PublishCard.vue'
import SettingsSection from '@/components/property/SettingsSection.vue'
import UtilitiesSection from '@/components/property/UtilitiesSection.vue'
import { toCentavos } from '@/lib/money'
import { errorMessage, fieldErrors } from '@/services/api'
import { propertyService, type PropertyDetailsInput } from '@/services/properties'
import { useToast } from '@/composables/useToast'
import type { Property } from '@/types/property'

const STEPS = ['Details', 'Location', 'Bedspaces or whole', 'Utilities', 'Settings', 'Photos', 'Review']

const toast = useToast()
const step = ref(1)
const busy = ref(false)
const errors = ref<Record<string, string[]>>({})
const property = ref<Property | null>(null)

const details = ref<PropertyDetailsInput>({ name: '', type: 'boarding_house', building_id: null, latitude: null, longitude: null })
const mode = ref<'bedspaces' | 'whole'>('bedspaces')
const units = reactive({ count: 4, label_pattern: 'Bed {n}', capacity: 4 })
const rent = ref('')

const preview = computed(() => {
  const label = (n: number) => (units.label_pattern.includes('{n}') ? units.label_pattern.replace('{n}', String(n)) : `${units.label_pattern} ${n}`)
  return units.count > 1 ? `${label(1)} … ${label(units.count)}` : label(1)
})

const canContinue = computed(() => {
  if (step.value === 1) return !!details.value.name?.trim() && !!details.value.type
  if (step.value === 3) return mode.value === 'whole' ? units.capacity >= 1 : units.count >= 1
  return true
})

async function create() {
  const rentCentavos = rent.value ? toCentavos(rent.value) : null
  if (rent.value && rentCentavos === null) return toast.error('Enter the rent in pesos, e.g. 1800.')

  busy.value = true
  errors.value = {}
  try {
    property.value = await propertyService.create({
      ...details.value,
      rental_mode: mode.value,
      units:
        mode.value === 'whole'
          ? { capacity: units.capacity, rent_centavos: rentCentavos }
          : { count: units.count, label_pattern: units.label_pattern, rent_centavos: rentCentavos },
    })
    toast.success('Property saved as a draft.')
    step.value = 4
  } catch (e) {
    errors.value = fieldErrors(e)
    const first = Object.keys(errors.value)[0]
    if (first && ['name', 'type', 'description', 'who_can_apply', 'building_id'].includes(first)) step.value = 1
    else if (first && ['street', 'barangay', 'city', 'province', 'latitude', 'longitude'].includes(first)) step.value = 2
    toast.error(Object.values(errors.value)[0]?.[0] ?? errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function reload() {
  if (property.value) property.value = await propertyService.get(property.value.id)
}
</script>

<style scoped>
.nav {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 24px;
}
.nav ion-button:only-child {
  margin-left: auto;
}
</style>
