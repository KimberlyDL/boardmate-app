<template>
  <component :is="page" />
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { isInstalledApp } from '@/lib/platform'

/**
 * The front page at "/" (W1): the installed app (Android, or added to the home screen) shows the
 * onboarding slides; a browser tab, on a phone or a computer, shows the website landing page.
 * Only the one shown is loaded.
 */
const page = isInstalledApp()
  ? defineAsyncComponent(() => import('./HomePage.vue'))
  : defineAsyncComponent(() => import('./WebLandingPage.vue'))
</script>
