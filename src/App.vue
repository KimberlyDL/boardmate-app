<template>
  <ion-app>
    <GlobalProgress />
    <OfflineNotice />
    <!-- The Android app updates through new app versions, not the web service worker -->
    <UpdatePrompt v-if="!native" />
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import GlobalProgress from '@/components/GlobalProgress.vue';
import OfflineNotice from '@/components/OfflineNotice.vue';
import UpdatePrompt from '@/components/UpdatePrompt.vue';
import { Capacitor } from '@capacitor/core';

const native = Capacitor.isNativePlatform();
</script>
