<template>
  <div>
    <p class="muted">Choose who helps run this property, and what they can do here.</p>

    <p v-if="!loading && !rows.length" class="muted">
      You have no caretakers yet. Invite one from the <router-link to="/owner/caretakers">Caretakers</router-link> tab.
    </p>

    <ion-list v-if="rows.length">
      <ion-item v-for="row in rows" :key="row.caretaker_id">
        <ion-checkbox v-model="row.assigned" slot="start" :aria-label="`Assign ${row.name}`" />
        <ion-label class="ion-text-wrap">
          <h2>{{ row.name }}</h2>
          <p>{{ row.email }}</p>
        </ion-label>
        <ion-select v-model="row.access_level" slot="end" interface="popover" :disabled="!row.assigned" aria-label="Access level">
          <ion-select-option value="collector">Collector</ion-select-option>
          <ion-select-option value="manager">Manager</ion-select-option>
        </ion-select>
      </ion-item>
    </ion-list>
    <p class="muted small">
      <strong>Collector:</strong> payments, reminders, late payers, move-out dates. <strong>Manager:</strong> everything you
      can do here except deleting the property and managing caretakers.
    </p>

    <ion-button v-if="rows.length" expand="block" :disabled="busy" @click="save">Save caretakers</ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonCheckbox, IonItem, IonLabel, IonList, IonSelect, IonSelectOption } from '@ionic/vue'
import { onMounted, ref } from 'vue'
import { errorMessage } from '@/services/api'
import { ownerService } from '@/services/owner'
import { propertyService } from '@/services/properties'
import { useToast } from '@/composables/useToast'
import type { Property } from '@/types/property'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ changed: [] }>()

interface Row {
  caretaker_id: number
  name: string
  email: string
  assigned: boolean
  access_level: 'collector' | 'manager'
}

const toast = useToast()
const rows = ref<Row[]>([])
const loading = ref(true)
const busy = ref(false)

onMounted(async () => {
  try {
    const { caretakers } = await ownerService.caretakers()
    rows.value = caretakers.map((c) => {
      const current = props.property.caretakers?.find((a) => a.caretaker_id === c.person.id)
      return {
        caretaker_id: c.person.id,
        name: c.person.name,
        email: c.person.email,
        assigned: !!current,
        access_level: current?.access_level ?? c.access_level,
      }
    })
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
})

async function save() {
  busy.value = true
  try {
    await propertyService.setCaretakers(
      props.property.id,
      rows.value.filter((r) => r.assigned).map((r) => ({ caretaker_id: r.caretaker_id, access_level: r.access_level })),
    )
    toast.success('Caretakers updated.')
    emit('changed')
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.small {
  font-size: 0.8rem;
}
</style>
