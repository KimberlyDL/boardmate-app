<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="backHref" /></ion-buttons>
        <ion-title>{{ property?.name ?? 'Property' }}</ion-title>
        <ion-buttons v-if="canDelete" slot="end">
          <ion-button color="danger" aria-label="Delete property" @click="remove">
            <ion-icon slot="icon-only" :icon="trashOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="property">
        <ion-segment :value="tab" :scrollable="true" @ion-change="tab = String($event.detail.value)">
          <ion-segment-button v-for="t in tabs" :key="t.id" :value="t.id">
            <ion-label>{{ t.label }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p v-if="loading" class="muted">Loading…</p>
      <p v-else-if="loadError" class="muted">{{ loadError }}</p>

      <div v-else-if="property" class="narrow">
        <p v-if="roleNote" class="role-note">{{ roleNote }}</p>

        <template v-if="tab === 'overview'">
          <publish-card :property="property" @updated="property = $event" />
          <property-details-form v-model="details" :readonly="!canEditDetails" :errors="errors" />
          <ion-button v-if="canEditDetails" expand="block" class="form-actions" :disabled="busy" @click="saveDetails">Save details</ion-button>
        </template>

        <units-section v-else-if="tab === 'units'" :property="property" @changed="reload" />
        <utilities-section v-else-if="tab === 'utilities'" :property="property" @changed="reload" />
        <settings-section v-else-if="tab === 'settings'" :property="property" />
        <photos-section v-else-if="tab === 'photos'" :property="property" @updated="property = $event" />
        <caretakers-section v-else-if="tab === 'caretakers'" :property="property" @changed="reload" />
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
  IonIcon,
  IonLabel,
  IonPage,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CaretakersSection from '@/components/property/CaretakersSection.vue'
import PhotosSection from '@/components/property/PhotosSection.vue'
import PropertyDetailsForm from '@/components/property/PropertyDetailsForm.vue'
import PublishCard from '@/components/property/PublishCard.vue'
import SettingsSection from '@/components/property/SettingsSection.vue'
import UnitsSection from '@/components/property/UnitsSection.vue'
import UtilitiesSection from '@/components/property/UtilitiesSection.vue'
import { errorMessage, fieldErrors } from '@/services/api'
import { propertyService, type PropertyDetailsInput } from '@/services/properties'
import { usePrompt } from '@/composables/usePrompt'
import { useToast } from '@/composables/useToast'
import type { Property } from '@/types/property'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const prompt = usePrompt()

const id = Number(route.params.id)
const property = ref<Property | null>(null)
const details = ref<PropertyDetailsInput>({})
const errors = ref<Record<string, string[]>>({})
const loading = ref(true)
const loadError = ref('')
const busy = ref(false)
const tab = ref(typeof route.query.tab === 'string' ? route.query.tab : 'overview')

const can = (ability: string) => property.value?.abilities.includes(ability as never) ?? false
const canEditDetails = computed(() => can('edit_details'))
const canDelete = computed(() => can('delete_property'))
const backHref = computed(() => (property.value?.my_role === 'owner' ? '/owner/properties' : '/caretaker/properties'))

const tabs = computed(() => [
  { id: 'overview', label: 'Overview' },
  { id: 'units', label: property.value?.rental_mode === 'whole' ? 'Unit' : 'Bedspaces' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'settings', label: 'Settings' },
  { id: 'photos', label: 'Photos' },
  ...(can('manage_caretakers') ? [{ id: 'caretakers', label: 'Caretakers' }] : []),
])

const roleNote = computed(() => {
  if (property.value?.my_role === 'manager') return `You manage this property for ${property.value.owner_name}.`
  if (property.value?.my_role === 'collector') return `You collect payments for ${property.value.owner_name}. Details are view-only.`
  return ''
})

function syncDetails(p: Property) {
  details.value = {
    name: p.name,
    type: p.type,
    building_id: p.building?.id ?? null,
    description: p.description,
    who_can_apply: p.who_can_apply,
    street: p.street,
    barangay: p.barangay,
    city: p.city,
    province: p.province,
    latitude: p.latitude,
    longitude: p.longitude,
  }
}

watch(property, (p) => p && syncDetails(p))

async function reload() {
  try {
    property.value = await propertyService.get(id)
  } catch (e) {
    loadError.value = errorMessage(e, 'This property was not found.')
  } finally {
    loading.value = false
  }
}

onMounted(reload)

async function saveDetails() {
  busy.value = true
  errors.value = {}
  try {
    property.value = await propertyService.update(id, details.value)
    toast.success('Saved.')
  } catch (e) {
    errors.value = fieldErrors(e)
    toast.error(Object.values(errors.value)[0]?.[0] ?? errorMessage(e))
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!property.value) return
  if (!(await prompt.confirm('Delete this property?', `${property.value.name} will be removed from your list and hidden from boarders. Its history is kept.`, 'Delete'))) return
  try {
    toast.success(await propertyService.remove(id))
    await router.replace('/owner/properties')
  } catch (e) {
    toast.error(errorMessage(e))
  }
}
</script>

<style scoped>
.role-note {
  background: var(--ion-color-light);
  padding: 8px 12px;
  border-radius: 8px;
}
</style>
