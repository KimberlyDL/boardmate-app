<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Properties</ion-title>
        <ion-buttons v-if="isOwnerArea" slot="end">
          <ion-button router-link="/owner/properties/new" aria-label="Add a property">
            <ion-icon slot="icon-only" :icon="addOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow ion-padding">
        <template v-if="!loading && !properties.length">
          <p v-if="isOwnerArea" class="center">
            You have no properties yet.<br />
            <ion-button class="form-actions" router-link="/owner/properties/new">Add your first property</ion-button>
          </p>
          <p v-else class="muted center">No properties assigned to you yet. The owner chooses which properties you help run.</p>
        </template>

        <ion-card v-for="p in properties" :key="p.id" button :router-link="`/properties/${p.id}`" class="card">
          <img v-if="p.cover_photo_url" :src="p.cover_photo_url" alt="" class="cover" loading="lazy" />
          <div v-else class="cover placeholder"><ion-icon :icon="homeOutline" /></div>
          <ion-card-header>
            <ion-card-subtitle>
              {{ p.type_label }} · {{ p.rental_mode_label }}<span v-if="p.city"> · {{ p.city }}</span>
            </ion-card-subtitle>
            <ion-card-title>{{ p.name }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>
              {{ p.counts.available }} of {{ p.counts.units }} {{ p.rental_mode === 'whole' ? 'unit' : 'bedspaces' }} available
              <span v-if="p.counts.not_ready"> · {{ p.counts.not_ready }} not ready</span>
            </p>
            <ion-badge :color="p.is_published ? 'success' : 'medium'">{{ p.is_published ? 'Published' : 'Draft' }}</ion-badge>
            <ion-badge v-if="p.my_role && p.my_role !== 'owner'" color="tertiary" class="gap">
              {{ p.my_role === 'manager' ? 'Manager' : 'Collector' }} · {{ p.owner_name }}
            </ion-badge>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { addOutline, homeOutline } from 'ionicons/icons'
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { errorMessage } from '@/services/api'
import { propertyService } from '@/services/properties'
import { useToast } from '@/composables/useToast'
import type { PropertySummary } from '@/types/property'

/** Owner: their properties. Caretaker: the properties they are assigned to. */
const route = useRoute()
const toast = useToast()
const isOwnerArea = computed(() => route.path.startsWith('/owner'))
const properties = ref<PropertySummary[]>([])
const loading = ref(true)

async function load() {
  try {
    const all = await propertyService.list()
    // An account that is both owner and caretaker sees each list in its own area.
    properties.value = all.filter((p) => (isOwnerArea.value ? p.my_role === 'owner' : p.my_role !== 'owner'))
  } catch (e) {
    toast.error(errorMessage(e))
  } finally {
    loading.value = false
  }
}

onIonViewWillEnter(load)

async function refresh(event: RefresherCustomEvent) {
  await load()
  event.target.complete()
}
</script>

<style scoped>
.card {
  margin: 0 0 16px;
}
.cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  display: block;
}
.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ion-color-light);
  font-size: 48px;
  color: var(--ion-color-medium);
}
.gap {
  margin-left: 6px;
}
</style>
