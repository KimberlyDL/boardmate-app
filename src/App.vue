<template>
  <ion-app>
    <GlobalProgress />
    <OfflineNotice />
    <UpdatePrompt />
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import GlobalProgress from '@/components/GlobalProgress.vue';
import OfflineNotice from '@/components/OfflineNotice.vue';
import UpdatePrompt from '@/components/UpdatePrompt.vue';
</script>
