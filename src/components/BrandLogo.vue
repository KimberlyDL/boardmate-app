<template>
  <span class="brand" :class="{ dark: onDark }">
    <img class="mark" :src="logoUrl" alt="" aria-hidden="true" width="20" height="26" />DormLink
  </span>
</template>

<script setup lang="ts">
import logoUrl from '@/assets/logo.svg'

/** The DormLink logo: the pin-and-house mark, then the wordmark (Bricolage Grotesque 800, -3% tracking). */
defineProps<{ onDark?: boolean }>()
</script>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.3em;
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--text-primary);
}
.mark {
  width: auto;
  height: 1.2em;
  flex: none;
}
.brand.dark {
  color: #ffffff;
}
</style>
