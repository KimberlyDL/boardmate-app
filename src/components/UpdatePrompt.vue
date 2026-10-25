<template>
  <span hidden />
</template>

<script setup lang="ts">
import { toastController } from '@ionic/vue'
import { watch } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { lucideDataUrl } from '@/lib/icons'

/**
 * Installed-app updates: when a new version has downloaded, ask before switching
 * (so nobody loses a half-filled form). Checks for a new version every hour.
 */
const HOUR = 60 * 60 * 1000

const { needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_url, registration) {
    if (registration) setInterval(() => registration.update().catch(() => undefined), HOUR)
  },
})

watch(needRefresh, async (ready) => {
  if (!ready) return
  const toast = await toastController.create({
    message: 'A new version of DormLink is ready.',
    icon: lucideDataUrl('refresh-cw'),
    position: 'top',
    color: 'medium',
    buttons: [
      { text: 'Later', role: 'cancel' },
      { text: 'Refresh', handler: () => updateServiceWorker() },
    ],
  })
  await toast.present()
})
</script>
