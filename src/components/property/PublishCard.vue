<template>
  <ion-card :color="property.is_published ? 'success' : undefined">
    <ion-card-header>
      <ion-card-subtitle>Listing</ion-card-subtitle>
      <ion-card-title>{{ property.is_published ? 'Published' : 'Draft' }}</ion-card-title>
    </ion-card-header>
    <ion-card-content>
      <p v-if="property.is_published">Boarders can find this property.</p>
      <template v-else>
        <p>Before boarders can find it:</p>
        <ul class="checklist">
          <li v-for="item in property.publish_checklist" :key="item.key" :class="{ ok: item.ok }">
            <ion-icon :icon="item.ok ? checkmarkCircle : ellipseOutline" /> {{ item.label }}
          </li>
        </ul>
      </template>
      <template v-if="canPublish">
        <ion-button v-if="!property.is_published" expand="block" :disabled="busy || !ready" @click="toggle(true)">Publish</ion-button>
        <ion-button v-else expand="block" fill="outline" color="dark" :disabled="busy" @click="toggle(false)">Unpublish</ion-button>
      </template>
    </ion-card-content>
  </ion-card>
</template>

<script setup lang="ts">
import { IonButton, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonIcon } from '@ionic/vue'
import { checkmarkCircle, ellipseOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { errorMessage } from '@/services/api'
import { propertyService } from '@/services/properties'
import { useToast } from '@/composables/useToast'
import type { Property } from '@/types/property'

const props = defineProps<{ property: Property }>()
const emit = defineEmits<{ updated: [property: Property] }>()

const toast = useToast()
const busy = ref(false)
const canPublish = computed(() => props.property.abilities.includes('publish_listing'))
const ready = computed(() => props.property.publish_checklist.every((i) => i.ok))

async function toggle(publish: boolean) {
  busy.value = true
  try {
    const { property, message } = await propertyService.publish(props.property.id, publish)
    toast.success(message)
    emit('updated', property)
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    busy.value = false
  }
}
</script>

<style scoped>
.checklist {
  list-style: none;
  padding: 0;
  margin: 8px 0 12px;
}
.checklist li {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ion-color-medium);
}
.checklist li.ok {
  color: var(--ion-color-success);
}
</style>
