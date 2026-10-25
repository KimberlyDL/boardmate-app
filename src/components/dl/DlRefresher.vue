<template>
  <ion-refresher slot="fixed" @ion-refresh="run">
    <ion-refresher-content pulling-text="Pull to refresh" refreshing-spinner="crescent" />
  </ion-refresher>
</template>

<script setup lang="ts">
import { IonRefresher, IonRefresherContent, type RefresherCustomEvent } from '@ionic/vue'
import { useHaptics } from '@/composables/useHaptics'

/**
 * Pull-to-refresh for a page: runs `refresh`, then closes, with a light tap on phones.
 * Place it first inside <ion-content>.
 */
const props = defineProps<{ refresh: () => Promise<unknown> | unknown }>()
const haptics = useHaptics()

async function run(event: RefresherCustomEvent) {
  haptics.tap()
  try {
    await props.refresh()
  } finally {
    event.target.complete()
  }
}
</script>
