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

        <!-- Dashboard (A10): what waits at the properties assigned to me -->
        <template v-if="dash">
          <template v-if="dash.properties.length">
            <todo-list :items="todo" :show-where="dash.properties.length > 1" />
            <h3>Places you look after</h3>
            <property-glance v-for="d in dash.properties" :key="d.property.id" :d="d" />
            <ion-button expand="block" fill="outline" router-link="/reports">Reports (spreadsheets)</ion-button>
          </template>
          <p v-else-if="owners.length" class="muted">No properties are assigned to you yet. The owner chooses which places you look after.</p>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  type RefresherCustomEvent,
  IonButton,
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
import { computed, ref } from 'vue'
import PropertyGlance from '@/components/dashboard/PropertyGlance.vue'
import TodoList from '@/components/dashboard/TodoList.vue'
import { todoItems } from '@/lib/dashboardTodo'
import { manila } from '@/lib/dayjs'
import { errorMessage } from '@/services/api'
import { caretakerService } from '@/services/caretaker'
import { dashboardService } from '@/services/dashboard'
import { useToast } from '@/composables/useToast'
import type { MyDashboard } from '@/types/dashboard'
import type { CaretakerLink } from '@/types/roles'

const toast = useToast()
const owners = ref<CaretakerLink[]>([])
const loading = ref(false)
const dash = ref<MyDashboard | null>(null)
const todo = computed(() => todoItems(dash.value?.properties ?? [], '/caretaker/applications'))

async function load() {
  loading.value = true
  try {
    [owners.value, dash.value] = await Promise.all([caretakerService.employers(), dashboardService.mine()])
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
