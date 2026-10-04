<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Caretaker</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" @ion-refresh="refresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="narrow">
        <h3>You work for</h3>
        <p v-if="!loading && !owners.length" class="muted">No owners yet. Accept an invitation from an owner to start.</p>

        <ion-card v-for="link in owners" :key="link.id">
          <ion-card-header>
            <ion-card-subtitle>{{ link.access_level_label }}</ion-card-subtitle>
            <ion-card-title>{{ link.person.business_name || link.person.name }}</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>{{ link.person.name }} · {{ link.person.phone || link.person.email }}</p>
            <p class="muted">Since {{ manila(link.since).format('MMM D, YYYY') }}</p>
          </ion-card-content>
        </ion-card>

        <p class="muted center">Assigned properties, collections and requests come in the next phases.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  onIonViewWillEnter,
} from '@ionic/vue'
import { ref } from 'vue'
import { manila } from '@/lib/dayjs'
import { errorMessage } from '@/services/api'
import { caretakerService } from '@/services/caretaker'
import { useToast } from '@/composables/useToast'
import type { CaretakerLink } from '@/types/roles'

const toast = useToast()
const owners = ref<CaretakerLink[]>([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    owners.value = await caretakerService.employers()
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
