<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/stay" /></ion-buttons>
        <ion-title>Room groups</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="narrow">
        <p v-if="loading" class="muted">Loading…</p>
        <p v-else-if="!groups.length" class="muted center">You are not in a room group yet. You join one when you move in.</p>
        <ion-list v-else lines="full">
          <ion-item v-for="g in groups" :key="g.id" button :router-link="`/groups/${g.id}`">
            <ion-label>
              <h2>Room {{ g.room_label }} · {{ g.property_name }}</h2>
              <p>{{ g.my_role_label }}<template v-if="!g.is_current"> · you left</template></p>
            </ion-label>
          </ion-item>
        </ion-list>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonBackButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue'
import { ref } from 'vue'
import { firstError } from '@/services/api'
import { groupService } from '@/services/groups'
import { useToast } from '@/composables/useToast'
import type { GroupSummary } from '@/types/groups'

/** The room groups I am (or was) in. */
const toast = useToast()
const groups = ref<GroupSummary[]>([])
const loading = ref(true)

onIonViewWillEnter(async () => {
  try {
    groups.value = await groupService.mine()
  } catch (e) {
    toast.error(firstError(e))
  } finally {
    loading.value = false
  }
})
</script>
