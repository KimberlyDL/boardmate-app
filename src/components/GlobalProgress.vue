<template>
  <ion-progress-bar v-if="visible" type="indeterminate" class="global-progress" aria-label="Loading" />
</template>

<script setup lang="ts">
import { IonProgressBar } from '@ionic/vue'
import { onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { requestsInFlight } from '@/lib/activity'

/**
 * A thin bar along the very top while the app waits: API requests or a screen
 * still downloading. Shown only after 300ms, so quick loads don't flicker.
 */
const visible = ref(false)
const routing = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const router = useRouter()
const offBefore = router.beforeEach(() => {
  routing.value = true
})
const offAfter = router.afterEach(() => {
  routing.value = false
})
router.onError(() => (routing.value = false))

watch(
  () => requestsInFlight.value > 0 || routing.value,
  (busy) => {
    clearTimeout(timer)
    if (busy) timer = setTimeout(() => (visible.value = true), 300)
    else visible.value = false
  },
)

onBeforeUnmount(() => {
  clearTimeout(timer)
  offBefore()
  offAfter()
})
</script>

<style scoped>
.global-progress {
  position: fixed;
  top: env(safe-area-inset-top, 0);
  left: 0;
  right: 0;
  z-index: 30000;
  height: 3px;
}
</style>
