<template>
  <Transition name="slide">
    <div v-if="!online" class="offline-notice" role="status">
      <WifiOff :size="16" aria-hidden="true" />
      <span>You're offline. Changes can't be saved until you reconnect.</span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { WifiOff } from 'lucide-vue-next'
import { useOnline } from '@/composables/useOnline'

/** A small notice at the top of every screen while the device has no connection. */
const online = useOnline()
</script>

<style scoped>
.offline-notice {
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 8px);
  left: 50%;
  z-index: 29999;
  display: flex;
  align-items: center;
  gap: 8px;
  width: max-content;
  max-width: calc(100% - 32px);
  padding: 8px 14px;
  border-radius: var(--radius-full);
  background: var(--bg-ink);
  color: var(--text-on-ink);
  font-size: 13px;
  font-weight: 500;
  transform: translateX(-50%);
}
.slide-enter-active,
.slide-leave-active {
  transition: opacity var(--motion-base) var(--ease-out), transform var(--motion-base) var(--ease-out);
}
.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translate(-50%, -8px);
}
</style>
