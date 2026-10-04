<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>BoardMate</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <h1>BoardMate</h1>
        <p>Find dorms and bedspaces, and run your boarding house in one place.</p>

        <ion-button expand="block" color="tertiary" router-link="/find">Find a dorm or bedspace</ion-button>
        <ion-button expand="block" router-link="/register">Create an account</ion-button>
        <ion-button expand="block" fill="outline" router-link="/login">Log in</ion-button>

        <ion-card>
          <ion-card-header>
            <ion-card-subtitle>System status</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <p v-if="system.loading">Checking the server…</p>
            <template v-else-if="system.health">
              <ion-chip color="success" data-test="api-status">API connected</ion-chip>
              <p>Server time: {{ serverTime }} (Manila)</p>
            </template>
            <template v-else>
              <ion-chip color="danger" data-test="api-status">API not reachable</ion-chip>
              <p>{{ system.error }}</p>
              <ion-button size="small" fill="outline" @click="system.checkHealth()">Try again</ion-button>
            </template>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonChip,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue'
import { computed, onMounted } from 'vue'
import { useSystemStore } from '@/stores/system'
import { manila } from '@/lib/dayjs'

const system = useSystemStore()

const serverTime = computed(() =>
  system.health ? manila(system.health.server_time).format('MMM D, YYYY h:mm A') : '',
)

onMounted(() => system.checkHealth())
</script>
