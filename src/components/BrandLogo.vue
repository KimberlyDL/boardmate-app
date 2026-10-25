<template>
  <span class="brand" :class="{ dark: onDark }">DormLink</span>
</template>

<script setup lang="ts">
/** The DormLink wordmark: Bricolage Grotesque 800, -3% tracking. There is no drawn mark yet. */
defineProps<{ onDark?: boolean }>()
</script>

<style scoped>
.brand {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1;
  color: var(--text-primary);
}
.brand.dark {
  color: #ffffff;
}
</style>
