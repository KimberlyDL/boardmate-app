<template>
  <ion-app :class="{ 'with-sidebar': sidebar }">
    <GlobalProgress />
    <OfflineNotice />
    <!-- The Android app updates through new app versions, not the web service worker -->
    <UpdatePrompt v-if="!native" />
    <!-- Desktop only, signed in: the sidebar replaces the bottom tabs (W1). -->
    <AppSidebar v-if="sidebar" class="sidebar" />
    <ion-router-outlet />
    <ImageViewer />
    <!-- Android phone browsers only: offer to open this page in the app (Phase 17.3). -->
    <OpenInAppBanner />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet } from '@ionic/vue';
import { computed } from 'vue';
import AppSidebar from '@/components/AppSidebar.vue';
import GlobalProgress from '@/components/GlobalProgress.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import OpenInAppBanner from '@/components/OpenInAppBanner.vue';
import OfflineNotice from '@/components/OfflineNotice.vue';
import UpdatePrompt from '@/components/UpdatePrompt.vue';
import { useScreen } from '@/composables/useScreen';
import { useAuthStore } from '@/stores/auth';
import { Capacitor } from '@capacitor/core';

const native = Capacitor.isNativePlatform();
const auth = useAuthStore();
const { isDesktop } = useScreen();
const sidebar = computed(() => isDesktop.value && auth.isLoggedIn);
</script>

<style scoped>
.sidebar {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  z-index: 10;
}
/* The pages sit to the right of the sidebar. */
.with-sidebar > ion-router-outlet {
  left: var(--sidebar-width);
}
</style>
